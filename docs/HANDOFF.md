# HANDOFF — retomar ELODIA OS en cualquier equipo

> **Regla del proyecto:** este archivo se actualiza **en cada commit que se sube al repositorio** (al terminar cada sprint y antes de cada `git push`). Es lo primero que se lee al cambiar de equipo o de sesión. Si el repo avanzó y este archivo no, el repo está mal entregado.
>
> **Última actualización:** 2026-10-23 · **Último commit incluido:** ver `git log -1` · **Fase actual:** Fase 1, Sprints 1.1–1.5 terminados.

---

## 1. Qué es esto (30 segundos)

**ELODIA OS** es una plataforma privada de gestión para la marca de tequila premium **ELODIA** (dirección, comercial, marketing, expansión). Usuario principal: el VP de la marca. Responsable técnico: Samuel Díaz.

- **Prompt maestro original:** [MASTER_PROMPT.md](MASTER_PROMPT.md) (texto íntegro con el que se encargó el proyecto, incluida la lista completa de módulos).
- **Reglas de trabajo para Claude Code:** [../CLAUDE.md](../CLAUDE.md).
- **Arquitectura y decisiones:** [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), [MODULES.md](MODULES.md), [SECURITY.md](SECURITY.md), [API.md](API.md), [BRANDING.md](BRANDING.md), [DECISIONS.md](DECISIONS.md).
- **Bitácora detallada por sprint:** [PROGRESS.md](PROGRESS.md). **Backlog:** [ROADMAP.md](ROADMAP.md).
- **Diseño de la web:** [../apps/web/PRODUCT.md](../apps/web/PRODUCT.md) y [../apps/web/DESIGN.md](../apps/web/DESIGN.md).

Reglas de oro (del prompt maestro): nunca inventar datos de negocio (productos, precios, clientes, logo); nunca secretos en git; permisos siempre validados en el backend; nada de botones decorativos; un módulo no está terminado sin persistencia, validación, permisos y pruebas, **verificado ejecutando**; no avanzar de fase sin aprobación del usuario; no desplegar ni llamar servicios de pago sin autorización.

---

## 2. Qué se hizo (estado al 2026-10-23)

Fase 0 (documentación) aprobada. Fase 1 en curso. Todo está en `main` de `github.com/sdiaz-a11y/Tequila-Elodia`.

| Sprint     | Qué contiene                                                                                                                                                                                                                                                                                                             | Estado |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1.1 / 1.1b | Monorepo pnpm + Turborepo, ESLint 10, Prettier, CI (GitHub Actions: lint, typecheck, test, build), `docs/DECISIONS.md`                                                                                                                                                                                                   | ✅     |
| 1.2        | `packages/database`: Prisma 7.10.1 + Supabase. Identidad (organizaciones, usuarios, roles, permisos, sesiones) + CRM base (cuentas, contactos, leads, etapas, oportunidades, actividades) + `audit_logs` append-only. RLS activado en todas las tablas. Seed idempotente de organización ELODIA, 186 permisos y 10 roles | ✅     |
| 1.3        | API base (NestJS 12): config validada con Zod, errores RFC 7807, request-id, logging estructurado, `AuditService`, `/health` y `/health/ready`, paginación común                                                                                                                                                         | ✅     |
| 1.4        | Autenticación: login argon2id, sesiones server-side en cookie, CSRF, bloqueo progresivo, rate limit, 2FA TOTP opcional, guards deny-by-default (`@Public`, `@Authenticated`, `@Requires`), CLI `create-user`                                                                                                             | ✅     |
| 1.5        | Web (Next.js 16): sistema de diseño "vidrio negro + dorado", login con la botella oficial, shell (sidebar colapsable, paleta Ctrl K, selector de periodo, notificaciones, menú de usuario), dashboard con estados vacíos honestos, página de seguridad con 2FA + QR, páginas de módulo pendiente                         | ✅     |

**Migraciones aplicadas en Supabase** (en `packages/database/prisma/migrations/`): `init_identity_crm`, `auth_columns`, `audit_user_restrict`, `must_change_password` (esta última añade `users.must_change_password` y `users.password_changed_at`; **aún no las usa ningún código**, es el primer paso del Sprint 1.6).

**Verificación al cierre:** `pnpm lint`, `pnpm typecheck`, `pnpm build` y `pnpm test` pasan (65 tests: 13 shared, 3 database, 34 api, 15 web). Los tests de integración usan la base real de Supabase y la organización aparte `ELODIA-TEST`.

### Datos que existen hoy en Supabase

- Organización **ELODIA** con 10 roles de sistema y sus permisos. **Un usuario real: `sdiaz@zigma3.com`, rol `tech_superadmin` (superadmin técnico), creado el 2026-10-23** con una contraseña temporal fuerte entregada en el chat (no está en el repo). Falta el usuario del VP.
- Organización **ELODIA-TEST**: usuarios de prueba creados por los tests y por mí (un usuario `demo@elodia-test.invalid`). Es basura inerte; sus filas de auditoría no se pueden borrar por diseño.

---

## 3. Qué sigue (plan)

Fase 1 tiene 12 sprints; faltan 7. Detalle y criterios en [ROADMAP.md](ROADMAP.md).

| Sprint              | Entregable                                                                                                                                                                                                          | Lo que necesita                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.6** (siguiente) | Administración: usuarios (alta con contraseña temporal que se muestra una vez + cambio forzado), roles y **matriz de permisos editable**, bitácora de auditoría con filtros y exportación CSV, cambio de contraseña | Decidir correo de superadmin/VP (decisión 7) y si el 2FA será obligatorio para ellos (D19). Sin proveedor de correo: la recuperación de acceso queda para cuando se elija uno |
| 1.7                 | CRM completo: cuentas, contactos (copiar teléfono, abrir WhatsApp), leads, pipeline Kanban configurable, oportunidades, actividades, importar/exportar CSV                                                          | Que el negocio defina las etapas del pipeline (no se inventan). Convendría una librería de drag-and-drop para el Kanban                                                       |
| 1.8                 | Territorios + expansión + distribuidores (sin duplicar cuentas)                                                                                                                                                     | Datos reales de mercados; mapa solo con ubicaciones válidas                                                                                                                   |
| 1.9                 | Proyectos y tareas (Kanban, calendario, lista)                                                                                                                                                                      | —                                                                                                                                                                             |
| 1.10                | Catálogo (productos/variantes), Brand Kit y archivos                                                                                                                                                                | **Bucket S3/Cloudflare R2** (credenciales) para archivos; datos reales de productos del equipo                                                                                |
| 1.11                | Dashboard con datos reales                                                                                                                                                                                          | Recharts (instalar); datos de los módulos anteriores                                                                                                                          |
| 1.12                | E2E con Playwright de flujos críticos, documentación, cierre de fase                                                                                                                                                | Playwright (instalar)                                                                                                                                                         |

**Después de la Fase 1:** Fase 2 (Content Studio IA, marketing, ventas, automatizaciones) y Fase 3 (inventario, finanzas, BI, asistente IA, portal). **Requieren aprobación explícita** y se desglosarán en sprints entonces. Necesitarán: Redis + BullMQ, un proveedor de IA (clave de API, sin llamadas de pago hasta autorizar), integraciones Meta/Google, facturación mexicana (CFDI) validada con contabilidad.

### Decisiones pendientes del usuario

1. Correo del **VP** (decisión 7 del ROADMAP). El superadmin técnico ya existe (ver sección 2). **Cambiar su contraseña temporal**: aún no hay pantalla de cambio de contraseña (llega en el Sprint 1.6); mientras tanto se puede restablecer con el CLI. Política: mínimo 12 caracteres (la contraseña corta que se propuso, de 9, se rechazó a propósito).
2. ¿2FA obligatorio para superadmin/VP? (D19).
3. **Dónde corre la API** (NestJS): contenedor (Railway/Fly/VPS) o funciones de Vercel (D10). Mientras no exista, la web desplegada no puede iniciar sesión.
4. Proveedor de correo (recuperación de contraseña, invitaciones).
5. Multi-organización: una sola (ELODIA) o varias.
6. Logotipo vectorial y tipografías oficiales (hoy: texto "ELODIA" y serif provisional).
7. Fuente de datos existente (¿Excel/otro CRM para importar?).

### Pendientes de seguridad (acción del usuario)

- **Rotar `SUPABASE_SECRET_KEY`** (se pegó en un chat) y actualizar `.env`.
- **Revocar el token personal de GitHub** que se pegó en un chat (GitHub → Settings → Developer settings → Personal access tokens).

---

## 4. Retomar en otro equipo (checklist)

### 4.1 Herramientas a instalar

| Herramienta                | Versión usada  | Notas                                                                                                                                                                                                                                                                                             |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git                        | 2.54           | Configurar `user.name` / `user.email` **del repo** (no viajan con el clon): `git config user.name "Samuel Díaz"` y `git config user.email "hola@zigma3.com"`                                                                                                                                      |
| Node.js                    | 24.x (mín. 22) |                                                                                                                                                                                                                                                                                                   |
| pnpm                       | 12.15.0        | Vía Corepack: `corepack enable` (en Windows sin admin: `corepack enable --install-directory <carpeta>` y añadir esa carpeta al PATH). El campo `packageManager` del `package.json` fija la versión                                                                                                |
| GitHub CLI (`gh`)          | reciente       | `gh auth login --web` con la cuenta dueña del repo (`sdiaz-a11y`). Para subir `.github/workflows/*` hace falta el permiso `workflow`: `gh auth refresh -s workflow`. Push sin tocar la config global: `git -c credential.helper= -c "credential.helper=!gh auth git-credential" push origin main` |
| Chrome/Chromium            | cualquiera     | Para las pruebas visuales con `agent-browser`                                                                                                                                                                                                                                                     |
| `agent-browser` (opcional) | 0.34           | `npm i -g agent-browser && agent-browser install`. Verificación visual desde Claude Code. La primera vez una sesión nueva puede tardar o colgarse: reintentar con `timeout`                                                                                                                       |
| Claude Code                | reciente       | VS Code o CLI                                                                                                                                                                                                                                                                                     |

No se necesita Docker, PostgreSQL local ni Redis: la base es Supabase. Redis solo desde la Fase 2.

### 4.2 Skills de Claude Code usadas (se instalan aparte, no viajan en el repo)

Las skills viven en `~/.claude/skills/` y los plugins en `~/.claude/plugins/`. Para continuar con la misma calidad de diseño conviene tener:

- **impeccable** (diseño; usado v4.1.1, hay v4.7.0 disponible: `npx impeccable update` en una sesión nueva, no durante una tarea). Flujo usado: `init` → `PRODUCT.md`, `DESIGN.md`, detector `detect.mjs`, revisión final.
- **frontend-design**, **web-design-guidelines**, **accessibility**.
- **Plugin de Vercel** (`vercel-plugin`): skills `vercel:nextjs`, `vercel:shadcn`, `vercel:deploy`, `vercel:env`, `vercel:status`…
- **vercel-react-best-practices**.
- **agent-browser** y **webapp-testing** (verificación en navegador).
- **tdd**, **code-review**, **simplify**, **security-review** (calidad).
- Para el asistente IA de la Fase 3: **claude-api**.
  Si falta alguna, `find-skills` ayuda a localizarla. El proyecto funciona sin ellas; solo cambia el flujo de diseño/revisión.

### 4.3 Puesta en marcha

```bash
git clone https://github.com/sdiaz-a11y/Tequila-Elodia.git
cd Tequila-Elodia
corepack enable          # o ver 4.1
pnpm install --frozen-lockfile
cp .env.example .env     # completar (ver 4.4); .env NUNCA se sube a git
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm --filter @elodia/database migrate:status   # debe decir "Database schema is up to date"
pnpm dev                 # web :3000, api :4000
```

Los tests de integración se saltan solos si no hay `DATABASE_URL`.

### 4.4 Variables de entorno (`.env` en la raíz; valores fuera del repo)

| Variable                                                                                           | Para qué                                                       | De dónde sale                                                                                                                      |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`                                 | Referencias del proyecto Supabase                              | Supabase → Project Settings → API                                                                                                  |
| `SUPABASE_SECRET_KEY`                                                                              | Solo servidor, nunca al frontend                               | Supabase → API Keys (rotarla tras filtrarse)                                                                                       |
| `DATABASE_URL`                                                                                     | Runtime (pooler transaccional, puerto 6543, `?pgbouncer=true`) | Supabase → botón **Connect** → Transaction pooler                                                                                  |
| `DIRECT_URL`                                                                                       | Migraciones (Session pooler, puerto 5432; sirve sin IPv6)      | Supabase → **Connect** → Session pooler                                                                                            |
| `APP_ENCRYPTION_KEY`                                                                               | Cifra los secretos TOTP. 32 bytes en base64                    | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Si se cambia, los 2FA existentes dejan de funcionar |
| `TRUST_PROXY=1`                                                                                    | La API ve la IP real detrás del proxy de Next                  | fijo                                                                                                                               |
| `API_URL`                                                                                          | Origen de la API para la web (servidor)                        | `http://localhost:4000` en local                                                                                                   |
| `PORT`, `WEB_ORIGIN`, `LOG_LEVEL`, `SESSION_TTL_HOURS`, `SESSION_IDLE_MINUTES`, `LOGIN_RATE_LIMIT` | Opcionales; ver `.env.example`                                 |                                                                                                                                    |

La contraseña de la base va **dentro** de `DATABASE_URL`/`DIRECT_URL` **sin corchetes** (`[ ]` del placeholder de Supabase). Pasar los secretos entre equipos con un gestor de contraseñas, nunca por chat ni por git.

### 4.5 Usuarios y datos de prueba

Existe el superadmin real `sdiaz@zigma3.com` en ELODIA (su contraseña temporal no está en el repo). Para crear otros usuarios, p. ej. de prueba (la contraseña va por variable de entorno, no por argumento):

```powershell
$env:NEW_USER_PASSWORD='una-contraseña-larga-de-12+'
pnpm --filter @elodia/api create-user -- --email tu@correo.mx --name "Tu Nombre" --role tech_superadmin --org ELODIA-TEST
```

Usa `--org ELODIA-TEST` para pruebas; el usuario real del superadmin se crea con `--org ELODIA` cuando el usuario decida el correo. Seed (idempotente): `pnpm --filter @elodia/database seed`. **Ojo:** el seed reaplica la matriz de permisos por defecto a los roles de sistema; cuando exista la edición de permisos (Sprint 1.6) hay que cambiarlo para que no pise cambios.

### 4.6 Convenciones y trampas conocidas

- UI en español (MX); código, commits y nombres en inglés. Commits terminan con `Co-Authored-By: Claude …` cuando los hace Claude.
- Dependencias: solo versiones con ≥ 7 días de antigüedad (política `minimumReleaseAge` de pnpm; no añadir excepciones). Antes de instalar, comprobar versión estable.
- Los scripts de instalación están bloqueados salvo los listados en `pnpm-workspace.yaml` (`allowBuilds`).
- En Windows, `pnpm` por Corepack puede no estar en el PATH de algunas shells: añadir la carpeta del shim.
- Los IDs son `uuid(7)` generados por Prisma (no por la BD): un INSERT SQL manual debe aportar `id`.
- `audit_logs` es append-only (triggers): los tests escriben dentro de transacciones con rollback o en `ELODIA-TEST`.
- Prisma: crear migraciones con `prisma migrate diff --from-config-datasource --to-schema … --script` (la base de Supabase no permite shadow database) y aplicarlas con `migrate:deploy`. Las migraciones destructivas requieren autorización.
- `next dev`/`next start`: la web habla con la API por la misma origen (`rewrites` hacia `API_URL`).

---

## 5. Desplegar la web en Vercel (para revisar lo hecho)

El despliegue lo hace el usuario (D10). **Sin API pública, la web desplegada solo muestra el login; no se puede entrar.** Dos caminos:

**A. Solo ver el diseño (login, 404).** Despliega la web y listo.
**B. Probar todo.** Además hay que exponer la API: un túnel temporal desde tu equipo (`cloudflared tunnel --url http://localhost:4000` o ngrok) y poner esa URL en `API_URL` de Vercel; o desplegar la API en un host (decisión pendiente, D10).

**Al importar el repo, Vercel lo detecta como "multi-service" (api NestJS + web Next.js) y pide un `vercel.json`. No lo uses:** pulsa **"Import single project"** en la fila `web` (carpeta `apps/web`). `api` se podría importar igual como segundo proyecto, pero eso no está preparado ni probado (ver decisión D10).

Configuración del proyecto en Vercel (**propuesta; no la he probado, no he desplegado nada**):

- **Root Directory:** `apps/web` y activar _Include source files outside of the Root Directory_ (la web usa `packages/shared`).
- **Install Command:** `pnpm install --frozen-lockfile` (en la raíz del repo).
- **Build Command:** `cd ../.. && pnpm turbo run build --filter=@elodia/web...`
- **Env vars (Production y Preview):** `API_URL=<URL pública de la API>`. No se necesita ningún secreto en la web.
- En la **API**: `WEB_ORIGIN=https://<tu-dominio>.vercel.app`, `TRUST_PROXY=1`, `NODE_ENV=production`, `DATABASE_URL`, `APP_ENCRYPTION_KEY`.
- Riesgo: el repo fija `pnpm@12.15.0`; si Vercel no soporta esa versión, habrá que ajustar el `packageManager` o el Install Command.

---

## 6. Cómo actualizar este archivo (checklist por push)

1. Mover lo terminado a la tabla de la sección 2 y actualizar fecha y "Último commit".
2. Actualizar la sección 3 (qué sigue, decisiones y pendientes de seguridad).
3. Revisar 4.x si cambiaron herramientas, variables de entorno, migraciones o trampas.
4. Anotar migraciones nuevas aplicadas y si hay datos de prueba nuevos.
5. Una línea en [PROGRESS.md](PROGRESS.md) (detalle técnico). No duplicar aquí el detalle.
6. Verificar que no hay secretos: `git diff --cached | grep -E 'sb_secret|ghp_|gho_|postgresql://'` debe salir vacío.
