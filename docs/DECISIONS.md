# DECISIONS — ELODIA OS

Registro de decisiones técnicas y de producto (ADR ligero). Una fila por decisión; no se borran, se marcan como reemplazadas.

| # | Fecha | Decisión | Motivo / consecuencia | Estado |
|---|---|---|---|---|
| D1 | 2026-10-22 | Monorepo pnpm + Turborepo | Workspaces eficientes, caché de tareas. Se activa con `corepack`. | Vigente |
| D2 | 2026-10-22 | Next.js (web) + NestJS (api) + Prisma | Separación UI / lógica de negocio / persistencia. | Vigente |
| D3 | 2026-10-22 | **Base de datos: Supabase** (solo PostgreSQL) | Decisión del usuario. Sin Supabase Auth ni acceso desde el frontend; RLS activado sin políticas para bloquear PostgREST/anon. Proyecto creado (ref en `.env`). Falta la contraseña de BD para `DATABASE_URL`/`DIRECT_URL`. | Vigente |
| D4 | 2026-10-22 | Sesiones server-side (cookie httpOnly) en vez de JWT en navegador | Reduce superficie de robo de token. | Vigente |
| D5 | 2026-10-22 | Zod como único lenguaje de validación (`packages/shared`) | Un contrato para web y api. | Vigente |
| D6 | 2026-10-22 | RBAC por recurso + acción + alcance, deny-by-default | Autorización siempre en backend. | Vigente |
| D7 | 2026-10-22 | `accounts` como entidad única de empresa | Evita duplicar clientes/distribuidores (requisito del prompt maestro). | Vigente |
| D8 | 2026-10-22 | TypeScript fijado en 5.9; Prisma 7.x estable (no RC 8) | Compatibilidad con el ecosistema (typescript-eslint soporta `<6.1`). | Vigente |
| D9 | 2026-10-22 | ESLint 10 + typescript-eslint + `eslint-config-next`, config plana en la raíz | `lint` deja de ser un alias de `tsc`. | Vigente |
| D10 | 2026-10-22 | **Hosting de `web`: Vercel**, desplegado manualmente por el usuario | El agente no despliega. El hosting de `api` (Nest) sigue pendiente: contenedor (Railway/Fly) o Vercel Functions. | Parcial |
| D11 | 2026-10-22 | Idioma: UI en español (MX), código y commits en inglés | Pendiente de confirmación explícita. | Propuesta |
| D12 | 2026-10-22 | Matriz inicial de permisos por rol en `packages/shared/src/default-grants.ts` | Propuesta de arranque (deny-by-default); el negocio debe validarla. El seed la reaplica a los roles de sistema. | Propuesta |
| D13 | 2026-10-22 | `DIRECT_URL` por Session pooler de Supabase | Evita depender de IPv6; soporta migraciones. | Vigente |
| D14 | 2026-10-22 | IDs `uuid(7)` generados por Prisma (no por la BD) | Orden temporal en índices. Inserciones SQL manuales deben aportar `id`. | Vigente |
| D15 | 2026-10-22 | `audit_logs.user_id` con `ON DELETE RESTRICT` | `SET NULL` chocaba con el trigger append-only. Los usuarios con historial no se borran, se desactivan. | Vigente |
| D16 | 2026-10-22 | CSRF: cabecera `X-Elodia-Csrf` + validación de `Origin` (sin token por sesión) | Suficiente con `SameSite=Lax` y CORS restringido; evita estado extra. | Vigente |
| D17 | 2026-10-22 | `@node-rs/argon2` (argon2id, binarios precompilados) | Sin compilación nativa en Windows/CI. | Vigente |
| D18 | 2026-10-22 | Pruebas de integración usan la organización `ELODIA-TEST` | Los rastros de auditoría (inmutables) quedan fuera de los datos reales de ELODIA. | Vigente |
| D19 | 2026-10-22 | 2FA obligatorio para superadmin/VP: **pendiente** | Hoy es opcional; exigirlo requiere flujo de alta en el primer login. | Abierta |

## Notas de fases
El prompt maestro numera las fases distinto al backlog de [ROADMAP.md](ROADMAP.md) (p. ej. CRM es "Fase 2" allí y sprint 1.7 aquí). Se sigue el ROADMAP, aprobado por el usuario el 2026-10-22; el contenido total es el mismo.

## Secretos
Las claves de Supabase viven solo en `.env` local (ignorado por git) y, para despliegue, en las variables de entorno de Vercel/proveedor. `SUPABASE_SECRET_KEY` nunca va al frontend ni a variables `NEXT_PUBLIC_*`.
