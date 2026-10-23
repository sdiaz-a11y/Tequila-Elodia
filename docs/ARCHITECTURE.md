# ARCHITECTURE — ELODIA OS

Estado: **aprobada; Fase 1 en curso** (ver [PROGRESS.md](PROGRESS.md) y [DECISIONS.md](DECISIONS.md))

## 1. Entorno detectado

| Herramienta | Estado |
|---|---|
| Node.js | v24.15.0 (instalado) |
| npm | 11.12.1 (instalado) |
| git | 2.54 (repositorio activo) |
| pnpm | 12.15 vía `corepack` (en Windows: `corepack enable --install-directory <dir>` y añadir `<dir>` al PATH si no hay permisos de administrador) |
| Docker | **no instalado** |
| PostgreSQL / Redis | **no instalados** localmente |

Implicación: la BD es Supabase (no requiere PostgreSQL local). Redis solo se necesita desde la Fase 2.

## 2. Estilo arquitectónico

**Monolito modular en monorepo** (pnpm workspaces + Turborepo).

```text
elodia-os/
├── apps/
│   ├── web/        Next.js (App Router) — UI, solo consume la API
│   └── api/        NestJS — toda la lógica de negocio, permisos y jobs
├── packages/
│   ├── database/   Prisma schema, migraciones, cliente, seeds
│   ├── shared/     Zod schemas, tipos, enums, catálogo de permisos (fuente única)
│   ├── ui/         Componentes shadcn/ui + tema ELODIA
│   └── config/     tsconfig, eslint, prettier compartidos
├── docs/  scripts/  infrastructure/
```

### Principios
1. **El backend es la única autoridad**: el frontend nunca accede a la BD ni aplica permisos como control real (solo para ocultar UI).
2. **Contrato único**: los esquemas Zod en `packages/shared` validan en web (formularios) y api (pipe de validación). Evita duplicar reglas.
3. **Módulos NestJS aislados**: cada módulo expone un `Service` público; otros módulos dependen del servicio, nunca de tablas ajenas. Eventos de dominio (`EventEmitter`) para desacoplar efectos (p. ej. `order.confirmed` → inventario / automatizaciones).
4. **Multi-tenant ligero**: toda tabla de negocio lleva `organization_id`; un guard + extensión de Prisma lo inyectan en cada consulta.
5. **Capacidades configurables**: inventario, facturación, publicación social, IA se activan por *feature flags* de la organización (no se asume que ELODIA fabrique o tenga almacenes).

## 3. Stack definitivo

| Capa | Elección | Nota |
|---|---|---|
| Frontend | Next.js (App Router), TS estricto, Tailwind, shadcn/ui, Lucide, Recharts, RHF + Zod | Versiones estables se verifican al instalar (Fase 1) |
| Backend | NestJS, TS, OpenAPI (`@nestjs/swagger`), `nestjs-zod` | Validación con Zod (un solo lenguaje de esquemas) en vez de class-validator |
| BD | **Supabase (PostgreSQL gestionado)** + Prisma, migraciones versionadas | Prisma conecta por `DIRECT_URL` (migraciones) y pooler `DATABASE_URL` (runtime). Solo se usa Postgres: la auth es propia (sesiones), no Supabase Auth; la autorización se aplica en la API, con RLS activado y sin políticas para bloquear acceso directo vía PostgREST/anon key. |
| Auth | Sesiones server-side (cookie `httpOnly`, `Secure`, `SameSite=Lax`) con argon2id; TOTP 2FA opcional para roles altos | Evita JWT en localStorage |
| Archivos | API S3-compatible (Cloudflare R2), URLs prefirmadas | Bucket privado |
| Jobs | BullMQ + Redis | Fase 2 |
| IA | Interfaz `AiProvider` intercambiable + `ai_usage_logs` + límites por org/usuario | Fase 2; sin llamadas de pago hasta autorizar |
| Tests | Vitest/Jest (unit), Supertest (integración API), Playwright (E2E) | |
| Calidad | ESLint, Prettier, `tsc --noEmit`, CI en GitHub Actions | |

Decisión de gestor de paquetes: **pnpm** (workspaces eficientes). Requiere `corepack enable`.

## 4. Backend: módulos NestJS

```text
apps/api/src/
├── core/          config, logging, errores, paginación, auditoría, prisma, eventos
├── auth/          login, sesiones, 2FA, guards
├── iam/           usuarios, roles, permisos (RBAC por recurso+acción)
├── dashboard/  crm/  sales/  distributors/  expansion/
├── catalog/  inventory/  projects/  brand/  content-studio/
├── marketing/  finance/  compliance/  bi/  assistant/  automations/
└── integrations/  (conectores: S3, social, n8n, facturación)
```

### Grafo de dependencias (solo hacia abajo)

```text
assistant ──► (todos, vía servicios con permisos del usuario)
automations ─► eventos de todos
bi, dashboard ─► lectura de crm, sales, expansion, marketing, finance, projects
sales ─► crm, catalog, inventory(reserva)
distributors ─► crm(accounts), expansion(territories)
marketing ─► content-studio, crm(leads)
content-studio ─► brand, files
crm, catalog, expansion, projects, brand, compliance ─► iam, core
```

Regla: **sin dependencias circulares**; la comunicación inversa se hace por eventos.

## 5. Estructura de rutas del backend

Prefijo `/api/v1`, un controlador por recurso, respuestas paginadas `{data, meta:{page,pageSize,total}}`, errores RFC 7807 (`application/problem+json`). Detalle en [API.md](API.md).

## 6. Frontend

- Route groups: `(auth)` login/recuperación, `(app)` shell con sidebar, breadcrumbs, búsqueda global (⌘K).
- Datos: *server components* para lectura inicial; TanStack Query para interactividad; mutaciones vía API REST.
- Cliente API tipado generado desde OpenAPI (`openapi-typescript`).
- Mapa de navegación en [MODULES.md](MODULES.md) §Navegación.
- `middleware.ts` solo redirige si no hay cookie de sesión; la validación real ocurre en la API.

## 7. Despliegue (propuesto, a confirmar)

- `web` → Vercel o similar; `api` + workers → contenedor (Railway/Fly/VPS); Postgres gestionado (Neon/Supabase/RDS); Redis gestionado; R2 para archivos.
- Entornos: `development`, `staging`, `production` con secretos separados. **No se despliega nada sin autorización explícita.**

## 8. Riesgos técnicos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | Alcance enorme (15 módulos) | Fases estrictas; MVP = CRM + distribuidores + expansión + tareas + catálogo + brand |
| R2 | Fuga de datos entre usuarios/orgs | Guards globales *deny-by-default*, `organization_id` forzado, tests de autorización por endpoint |
| R3 | Dinero/impuestos incorrectos | `Decimal` en BD (nunca float), snapshot de precio/impuesto/descuento en líneas, tests de cálculo |
| R4 | Doble ejecución de automatizaciones/reservas | Claves de idempotencia únicas en `automation_runs`, transacciones con `SELECT … FOR UPDATE` en inventario |
| R5 | Costos/abuso de IA | Cuotas, registro de tokens, proveedor abstracto, tools con permisos del usuario, confirmación en escrituras |
| R6 | Cumplimiento (publicidad de alcohol, NOM de tequila) | Flujo de aprobación humana obligatorio; el sistema nunca marca "cumple" automáticamente |
| R7 | Entorno local sin Docker/Postgres/Redis | Decidir BD local (ver Roadmap); Redis solo necesario desde Fase 2 |
| R8 | Datos reales aún desconocidos (precios, productos, territorios) | Sin seeds ficticios de negocio; solo roles/permisos y estados vacíos |
| R9 | Branding no oficial | Paleta marcada como provisional; tokens CSS centralizados para cambiar fácil |
| R10 | Pérdida de datos | Backups automáticos del proveedor + `scripts/backup` + prueba de restauración antes de producción |
