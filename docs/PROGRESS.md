# PROGRESS — ELODIA OS

**Fase actual:** Fase 1 — Sprints 1.1, 1.2 y 1.3 completados; siguiente: 1.4 (autenticación: login, sesiones, 2FA, guard deny-by-default)
**Última actualización:** 2026-10-22

## Módulos completados
Ninguno (aún no hay código de negocio).

## En desarrollo
Ninguno.

## Entregado en Fase 0
- `docs/ARCHITECTURE.md`, `DATABASE.md`, `MODULES.md`, `ROADMAP.md`, `BRANDING.md`, `SECURITY.md`, `API.md`, `PROGRESS.md`, `CLAUDE.md`, `README.md`.

## Pendiente
Todo el backlog de [ROADMAP.md](ROADMAP.md) (Fase 1 en adelante).

## Problemas detectados
- Docker y Redis no instalados (Redis solo desde Fase 2). pnpm se usa vía corepack. La BD es Supabase.
- Las claves de Supabase están en `.env` local (ignorado por git). La `sb_secret_...` se pegó en un chat: conviene **rotarla**.
- Faltan logotipo vectorial independiente y tipografías oficiales (ver BRANDING.md).

## Decisiones tomadas (propuestas)
- Monorepo pnpm + Turborepo; Next.js + NestJS + Prisma + PostgreSQL.
- **Base de datos: Supabase** (decisión del usuario, 2026-10-22). Uso solo como PostgreSQL; sin Supabase Auth ni acceso desde el frontend.
- Sesiones server-side (cookie httpOnly) en lugar de JWT en navegador.
- Zod como lenguaje único de validación (web + api) en `packages/shared`.
- RBAC por recurso+acción+alcance, deny-by-default.
- `accounts` como entidad única de empresa (distribuidores/clientes la referencian).

## Pruebas realizadas
N/A (fase solo documental). Verificado: versiones de herramientas del entorno.

## Próximos pasos
1. Revisión y aprobación de Fase 0 y respuesta a las 10 decisiones pendientes de [ROADMAP.md](ROADMAP.md).
2. Iniciar Fase 1, Sprint 1.1 (monorepo).

## Sprint 1.1 (2026-10-22) — Monorepo
- pnpm 12 + Turborepo; `packages/{config,shared}`, `apps/api` (NestJS 12: helmet, throttler, OpenAPI en `/api/docs`, `GET /api/v1/health`), `apps/web` (Next 16 + Tailwind 4, tema ELODIA, botella oficial).
- TypeScript fijado en 5.9 (TS 7 es muy reciente para el ecosistema). Prisma: la etiqueta `latest` es un RC (8.0.0-rc); se usará 7.x estable en el Sprint 1.2.
- Verificado: `pnpm build`, `pnpm typecheck`, `pnpm test` OK; health responde 200 con cabeceras de seguridad.

## Sprint 1.1b (2026-10-22) — Cierre de 1.1
- ESLint 10 + typescript-eslint + eslint-config-next (config plana en `eslint.config.mjs`); `lint` ya no es un alias de `tsc`.
- CI en `.github/workflows/ci.yml` (lint, typecheck, test, build). Sin secretos.
- `*.tsbuildinfo` ignorado y retirado del índice; `docs/DECISIONS.md` creado; README, ARCHITECTURE y ROADMAP actualizados.
- Hosting de `web`: Vercel, lo despliega el usuario (D10).
- Bloqueado: `unrs-resolver` (script de instalación) desactivado en `allowBuilds`; es solo un fallback opcional.

## Sprint 1.2 (2026-10-22) — Prisma + Supabase
- `packages/database` (`@elodia/database`): Prisma 7.10.1 (estable) + `@prisma/adapter-pg`. Runtime con `DATABASE_URL` (pooler transaccional 6543); migraciones con `DIRECT_URL` (Session pooler 5432, válido sin IPv6).
- Esquema: organizations, users, roles, permissions, role_permissions (con `scope`), user_roles, sessions, accounts, contacts, leads, pipeline_stages, opportunities, activities, audit_logs. IDs `uuid(7)` generados por Prisma (cliente), dinero `Decimal(14,2)`, soft delete en entidades de negocio.
- Migración `20261022000000_init_identity_crm` **aplicada en Supabase**. Incluye a mano: RLS activado en las 14 tablas (sin políticas), `audit_logs` append-only por trigger (UPDATE/DELETE/TRUNCATE) e índice único parcial de RFC por organización.
- `packages/shared/src/default-grants.ts`: matriz inicial de permisos por rol (propuesta editable, D12) con pruebas.
- Seed idempotente (`pnpm --filter @elodia/database seed`): organización ELODIA, 186 permisos, 10 roles de sistema y sus grants. **Sin usuarios ni datos de negocio.**
- Verificado ejecutando: lint, typecheck, build y 12 tests OK; 3 tests de integración contra Supabase (seed, idempotencia, RLS + audit append-only con rollback). Esos tests se saltan si no hay `DATABASE_URL` (p. ej. en CI).
- Pendiente de 1.2: `territory_id` y `distributor_id` se añaden en el Sprint 1.8 (aún no existen esas tablas); pipeline_stages sin seed (los define el negocio); usuarios iniciales (decisión 7).
- Corrección: el `.env` tenía la contraseña entre `[ ]` (restos del placeholder de Supabase); se quitaron.

## Sprint 1.3 (2026-10-22) — API base
- `apps/api/src/core/`: configuración validada con Zod (falla al arrancar, sin imprimir valores), `PrismaService`, `AuditService`, `ZodValidationPipe`, request-id (acepta el del cliente solo si es seguro), logging estructurado (JSON en producción) y `ProblemDetailsFilter`.
- Errores RFC 7807 (`application/problem+json`) con `requestId`; Zod→400 con `errors[]`, Prisma P2002/P2003→409, P2025→404, 5xx sin filtrar detalles internos.
- `GET /api/v1/health` (liveness) y `GET /api/v1/health/ready` (consulta la BD; 503 si no responde).
- `packages/shared/src/http.ts`: esquemas de paginación (`page`, `pageSize`≤100), envoltorio `{data, meta}` y `ProblemDetails`.
- `AuditService.record(entry, tx?)`: escribe en `audit_logs` dentro de la transacción del cambio.
- Rate limiting global (120/min) ya activo; límites estrictos para login llegan en el 1.4.
- Verificado ejecutando: lint, typecheck, build y 25 tests OK (14 api, 10 shared, 1 web; más 3 de integración de database). Pruebas e2e con supertest del filtro/request-id/health; auditoría probada contra Supabase con rollback. API compilada arrancada contra Supabase: `/health` 200, `/health/ready` 200, ruta inexistente 404.
- Pendiente: la auditoría se invocará desde cada módulo (no hay interceptor automático: cada escritura decide qué registra); OpenAPI sigue básico hasta tener endpoints reales.
