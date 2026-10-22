# DATABASE — Modelo relacional inicial

Motor: PostgreSQL · ORM: Prisma · Migraciones versionadas (`prisma migrate`). Este diseño se refina en Fase 1 por módulo; las tablas de Fase 2/3 se crean en su fase.

## Convenciones

- PK: `id uuid` (v7 si el motor lo permite; si no, `gen_random_uuid()`).
- Todas las tablas de negocio: `organization_id` (FK), `created_at`, `updated_at`, `created_by`, `updated_by`.
- Borrado lógico (`deleted_at`) en entidades de negocio (accounts, contacts, leads, opportunities, products, distributors, documents…). **No** en tablas de registro histórico (audit_logs, movimientos, pagos): son inmutables.
- Dinero: `numeric(14,2)`; moneda `char(3)` por documento (por defecto MXN). Tasas/porcentajes `numeric(7,4)`.
- Estados: enums de PostgreSQL definidos en `packages/shared` y espejados en Prisma.
- Índices: FK, `(organization_id, status)`, búsquedas por texto con `pg_trgm` (nombre/email), únicos parciales con `WHERE deleted_at IS NULL`.
- Transacciones obligatorias: cotización→pedido, pedido→reserva de inventario, registro de pago→saldo, movimiento de inventario→existencia, cambio de etapa→actividad+auditoría.

## Entidades por dominio

### Identidad y acceso (Fase 1)
- **organizations** (id, name, settings jsonb, feature_flags jsonb)
- **users** (id, org, email único por org, password_hash, name, status, last_login_at, totp_secret_enc)
- **roles** (id, org, key, name, is_system) — claves iniciales: `tech_superadmin, director_vp, ops_admin, sales_manager, salesperson, marketing, operations, finance, collaborator, external_distributor`
- **permissions** (id, resource, action) — acciones: `read, create, update, delete, approve, export`; único `(resource, action)`
- **role_permissions** (role_id, permission_id, scope: `all|own|team`)
- **user_roles** (user_id, role_id)
- **sessions** (id, user_id, token_hash, ip, user_agent, expires_at, revoked_at)

> `role_permissions` añade `scope` (propios/equipo/todos), necesario p. ej. para que un vendedor vea solo sus oportunidades. `external_distributor` queda limitado a su `distributor_id` (columna `users.distributor_id` nullable).

### CRM (Fase 1)
- **accounts** (id, org, name, legal_name, rfc, type: `prospect|client|distributor|partner|supplier`, status, owner_id, territory_id, parent_id) — *entidad única* de empresa; distribuidores y clientes la referencian, no la duplican.
- **contacts** (id, org, account_id, name, email, phone, role_title, is_primary)
- **leads** (id, org, source, campaign_id, name, company, email, phone, status, owner_id, converted_account_id, converted_at)
- **opportunities** (id, org, account_id, pipeline_stage_id, title, amount, currency, probability, expected_close, status: `open|won|lost`, lost_reason, owner_id)
- **pipeline_stages** (id, org, name, position, probability_default, is_won, is_lost) — configurables
- **activities** (id, org, type: `call|meeting|email|note|task_followup`, subject, notes, due_at, done_at, owner_id, polimórfico: `account_id | contact_id | lead_id | opportunity_id`)

### Ventas (Fase 2)
- **price_lists** (id, org, name, currency, valid_from, valid_to, is_default) + **price_list_items** (price_list_id, variant_id, unit_price)
- **quotes** (id, org, number único por org, account_id, opportunity_id, status, valid_until, subtotal, discount_total, tax_total, total, approved_by)
- **quote_items** (quote_id, variant_id, description, qty, unit_price, discount_pct, tax_rate, line_total) — *snapshot* histórico
- **orders** (id, org, number, quote_id, account_id, distributor_id?, status, totales, balance)
- **order_items** (mismo patrón snapshot)
- **payments** (id, org, order_id, amount, method, paid_at, reference, status) — inmutable; el saldo se deriva

### Catálogo e inventario (catálogo F1; inventario F3)
- **products** (id, org, name, description, category, status)
- **product_variants** (id, product_id, sku único por org, presentation, volume_ml, abv, cost, status) — *sin datos inventados; se capturan por el usuario*
- **warehouses** (id, org, name, type: `own|third_party|distributor`, address, is_active)
- **inventory_lots** (id, variant_id, lot_code, produced_at, expires_at, attributes jsonb)
- **inventory_movements** (id, variant_id, warehouse_id, lot_id, type: `in|out|transfer|adjust|reserve|release`, qty, ref_type, ref_id, reason) — libro mayor inmutable; existencia = suma, con vista/materialización

### Distribuidores y expansión (Fase 1)
- **territories** (id, org, name, type: `country|state|city|region`, parent_id, geo jsonb, status)
- **distributors** (id, org, account_id **único**, status, commercial_terms jsonb, contract_start, contract_end, tier)
- **distributor_territories** (distributor_id, territory_id, exclusivity)
- **expansion_plans** (id, org, territory_id, name, status, budget_amount, owner_id, starts_on, ends_on, goals jsonb)
- **expansion_updates** (id, plan_id, note, progress_pct, author_id, created_at)

### Marca y contenido (brand F1; contenido F2)
- **brand_kits** (id, org, tone, restrictions, approved_messages jsonb, palette jsonb, fonts jsonb) + **brand_assets** (kit_id, kind: `logo|photo|reference|product`, file_id, official bool)
- **files** (id, org, storage_key, mime, size, checksum, uploaded_by) — referencia al objeto S3
- **content_projects** (id, org, campaign_id, brief jsonb, status, owner_id)
- **content_assets** (id, project_id, kind, file_id?, channel)
- **content_versions** (id, asset_id, version, body, prompt_id?, ai_generated bool, author_id)
- **content_approvals** (id, version_id, reviewer_id, decision, comment, decided_at)
- **social_publications** (id, asset_id, channel, scheduled_at, published_at, external_id, status, metrics jsonb)
- **prompt_templates** (id, org, name, body, variables)

### Marketing y finanzas (F2/F3)
- **campaigns** (id, org, name, objective, status, starts_on, ends_on, budget_id, owner_id)
- **budgets** (id, org, scope_type, scope_id, period, amount)
- **expenses** (id, org, budget_id, category, amount, incurred_on, vendor, ref_type, ref_id, receipt_file_id)

### Proyectos (Fase 1)
- **projects** (id, org, name, status, owner_id, starts_on, due_on)
- **tasks** (id, org, project_id, parent_task_id, title, description, status, priority, assignee_id, due_at, related_type/related_id opcional) + **task_comments**, **task_attachments**

### Cumplimiento (Fase 3, o antes si se requiere)
- **compliance_documents** (id, org, category, title, product_id?, supplier_account_id?, file_id, version, expires_on, status: `draft|in_review|approved|expired`, approved_by, approved_at) + historial en `document_versions`

### Transversales
- **notifications** (id, user_id, type, payload, read_at)
- **automation_workflows** / **automation_runs** (id, workflow_id, **idempotency_key único**, status, attempts, error, started_at, finished_at)
- **ai_usage_logs** (id, org, user_id, provider, model, feature, input_tokens, output_tokens, cost_estimate, created_at)
- **audit_logs** (id, org, user_id, action, resource, resource_id, before jsonb, after jsonb, ip, created_at) — append-only; sin UPDATE/DELETE por permisos de BD

## Relaciones clave (resumen)

```text
organizations 1─* users ─* user_roles *─ roles ─* role_permissions *─ permissions
accounts 1─* contacts          accounts 1─* opportunities ─* activities
accounts 1─0..1 distributors ─* distributor_territories *─ territories
territories 1─* expansion_plans ─* expansion_updates
leads ─(convierte)→ accounts + opportunities
quotes 1─* quote_items ; quotes ─(convierte)→ orders 1─* order_items ; orders 1─* payments
products 1─* product_variants ─* inventory_movements ; warehouses ─* inventory_movements
campaigns 1─* content_projects 1─* content_assets 1─* content_versions 1─* content_approvals
```

## Anti-duplicación
- Una empresa = una fila en `accounts`; `distributors.account_id` es único.
- Un SKU = una fila en `product_variants`; ventas/inventario lo referencian.
- Un archivo = una fila en `files`; el resto lo referencia.
- Dedupe de leads/accounts por email/RFC/nombre normalizado (índice trigram + validación en servicio).
