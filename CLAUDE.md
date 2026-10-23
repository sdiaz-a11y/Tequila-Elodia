# CLAUDE.md — ELODIA OS

Plataforma privada de gestión empresarial (dirección, comercial, marketing, expansión) de **ELODIA**, tequila premium mexicano. Responsable técnico: Samuel Díaz. Usuario final principal: el VP de la marca.

## Al iniciar sesión
Lee primero `docs/PROGRESS.md`, luego `docs/ARCHITECTURE.md` y el doc del módulo a tocar. Actualiza `PROGRESS.md` al terminar cada módulo.

## Estado
Fase 1 en curso (aprobada por el usuario el 2026-10-22). Ver docs/PROGRESS.md. No avanzar a Fase 2 sin aprobación.

## Stack (objetivo)
Monorepo pnpm + Turborepo · `apps/web` Next.js App Router + TS + Tailwind + shadcn/ui + Recharts + RHF + Zod · `apps/api` NestJS + OpenAPI · `packages/database` Prisma + PostgreSQL · `packages/shared` Zod/permisos · BullMQ+Redis (F2) · S3/R2.

## Reglas de negocio y de trabajo
- Trabajar incremental, módulo por módulo; un módulo no está terminado sin persistencia, validación, permisos y pruebas, verificado ejecutando.
- Inspeccionar archivos antes de modificarlos; no borrar funcionalidad sin permiso; no instalar dependencias innecesarias (verificar versión estable).
- **Nunca** inventar datos de negocio (productos, precios, clientes), credenciales, logos ni fotos oficiales. Usar estados vacíos.
- No llamar servicios de pago ni desplegar sin autorización. No operaciones destructivas sin confirmación.
- Permisos siempre validados en backend (deny-by-default, `resource:action` + alcance). Nunca API keys en el frontend. Nunca subir secretos a git.
- Dinero con `Decimal`; guardar snapshot de precio/descuento/impuesto en líneas de cotización/pedido.
- La IA no declara cumplimiento legal ni sustituye recursos oficiales; todo pasa por aprobación humana.
- Branding: tokens en `docs/BRANDING.md` (paleta provisional), modo oscuro, dorado como acento.
- Idioma: UI en español (MX); código, commits y nombres en inglés (a confirmar).
- Al cerrar fase: resumen de archivos, funcionalidades, pruebas y pendientes.

## Comandos
`pnpm install` · `pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test`. Web en :3000, API en :4000 (`PORT`). pnpm 12 bloquea scripts de instalación: se permiten en `allowBuilds` de pnpm-workspace.yaml.
