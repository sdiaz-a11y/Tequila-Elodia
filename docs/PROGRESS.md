# PROGRESS — ELODIA OS

**Fase actual:** Fase 1 — Sprints 1.1 a 1.5 completados; siguiente: 1.6 (administración: usuarios, roles, matriz de permisos, bitácora)
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

## Sprint 1.4 (2026-10-22) — Autenticación y autorización

- `apps/api/src/auth/`: login (argon2id), sesiones server-side en cookie `HttpOnly`/`SameSite=Lax` (`__Host-` + `Secure` en producción), logout, logout-all, `GET /auth/me`, 2FA TOTP opcional (setup/enable/disable) con secreto cifrado AES-256-GCM.
- Guards globales en orden: rate limit → CSRF → sesión → permisos. **Deny-by-default**: rutas sin `@Public()`/`@Authenticated()`/`@Requires()` → 403. Alcance (`own|team|all`) disponible en `req.scope`.
- Bloqueo progresivo de cuenta, rate limit de login por IP (429), respuestas de error indistinguibles, auditoría de login/fallos/bloqueos/logout/2FA.
- Migraciones `…_auth_columns` (lock, TOTP, last_seen) y `…_audit_user_restrict` aplicadas en Supabase.
- CLI `pnpm --filter @elodia/api create-user -- --email … --name … --role …` (contraseña por `NEW_USER_PASSWORD`, nunca por argumento). **No se creó ningún usuario real**: falta el correo del superadmin técnico/VP (decisión 7).
- Bug corregido: `loginSchema` rechazaba correos con espacios en vez de normalizarlos (Zod valida antes del transform).
- Verificado ejecutando: lint, typecheck, build y 51 tests OK (incl. 11 de integración de auth contra Supabase y vectores RFC 6238). Probado con la API real: CLI crea usuario → login 200 con cookie HttpOnly → `/me` 200 → sin cookie 401 → logout 204 → `/me` 401.
- Pendiente: recuperación de acceso por correo (requiere proveedor de email: decisión), 2FA obligatorio para roles altos (D19), cambio de contraseña (Sprint 1.6 con administración de usuarios), invalidación de sesiones al desactivar un usuario ya efectiva (se valida `status` en cada petición).

## Sprint 1.5 (2026-10-22) — Web base y sistema de diseño

- Diseño: `apps/web/PRODUCT.md` (producto) y `apps/web/DESIGN.md` (sistema visual: vidrio negro + dorado grabado; tokens, tipografía Cormorant/Geist, movimiento, reglas). Hecho con las skills impeccable, frontend-design, vercel:nextjs, vercel:shadcn y vercel-react-best-practices.
- **Login** (`/login`): botella oficial con barrido de luz recortado por su canal alfa, resplandor que respira, paralaje con el puntero y divisor de estrella; formulario con RHF + Zod, mostrar/ocultar contraseña, paso de código TOTP, errores accesibles y límite de intentos.
- **Shell**: sidebar colapsable (rail de iconos) con 7 grupos colapsables y píldora dorada animada entre ítems; cabecera con breadcrumbs, búsqueda/paleta de comandos (Ctrl K), selector de periodo en la URL (`?periodo=`), notificaciones (bandeja vacía honesta) y menú de usuario; menú móvil como hoja lateral. La navegación respeta permisos (solo oculta; la API decide). Módulos aún no construidos: listados pero `aria-disabled` con su ETA.
- **Páginas**: Dashboard ejecutivo (saludo con hora de CDMX, estado real de plataforma incl. `/health/ready`, estado vacío honesto de indicadores, mapa de módulos), Seguridad de la cuenta (2FA con QR generado en el navegador, cierre de todas las sesiones con confirmación), páginas de módulo pendiente, 404, error y loading con skeleton.
- **Seguridad**: `proxy.ts` (Next 16) redirige sin cookie; la validación real ocurre en el layout `(app)` llamando a la API; `?next=` solo acepta rutas internas; cabeceras de seguridad; rewrites same-origin (D20).
- Verificado ejecutando: lint, typecheck, build y 65 tests (15 web nuevos: nav/permisos, `safeNext`, periodos, utilidades, cliente API). Probado en navegador real contra API y Supabase: login, shell, paleta de comandos, 2FA setup con QR, móvil y escritorio. Detector de diseño de Impeccable: 0 hallazgos.
- Bugs encontrados al probar en navegador y corregidos: bucle de redirecciones por nombre de cookie distinto entre web (producción) y API (desarrollo) → el proxy acepta ambos; desborde horizontal en móvil por `truncate` en columnas de grid → `minmax(0,1fr)`; badges estirados (CardHeader `grid` vs `flex-row`); anillo de foco doble (regla global fuera de `@layer base`).
- Pendiente: quick-actions "+ Nuevo" en cabecera (se añade cuando existan creaciones reales, desde el 1.7); tests E2E con Playwright (Sprint 1.12); logotipo y tipografías oficiales (la UI usa texto "ELODIA" y serif provisional).
- Revisión independiente (agente con contexto fresco) sobre capturas y código; se corrigió lo válido: contraste de `--text-faint` (4.26:1 → ≥ 4.85:1) y de los ítems pendientes del sidebar (3.6:1), jerga interna ("Sprint 1.7", "Fase 2") reemplazada por "Próximamente" en la UI (los sprints solo viven en docs y en `plan` de `lib/nav.ts`), cue visible (reloj) y texto para lector de pantalla en módulos pendientes, `prefers-reduced-motion` también en el paralaje/entrada de la botella, botón de cierre en el menú móvil, objetivos táctiles de 44 px en móvil, ⌘K en Apple, botón dorado deshabilitado legible, "Sin notificaciones" (más honesto que "Todo al día") y saludo "Buenas noches" de madrugada. Hallazgos obsoletos (alineación del login, lema duplicado, breadcrumb móvil) ya estaban resueltos en el código.

## Traspaso (2026-10-23)

- Se añadieron `docs/HANDOFF.md` (estado, plan, requisitos, puesta en marcha en otro equipo, despliegue en Vercel, checklist por push) y `docs/MASTER_PROMPT.md`. Migración `must_change_password` aplicada en Supabase (primer paso del Sprint 1.6, aún sin uso en código).
