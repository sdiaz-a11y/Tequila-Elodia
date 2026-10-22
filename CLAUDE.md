# CLAUDE.md — ELODIA OS

Plataforma privada de gestión empresarial (dirección, comercial, marketing, expansión) de **ELODIA**, tequila premium mexicano. Responsable técnico: Samuel Díaz. Usuario final principal: el VP de la marca.

## Al iniciar sesión
Lee primero `docs/PROGRESS.md`, luego `docs/ARCHITECTURE.md` y el doc del módulo a tocar. Actualiza `PROGRESS.md` al terminar cada módulo.

## Estado
Fase 0 completada (solo documentación). **No empezar Fase 1 sin aprobación explícita del usuario.** Tampoco avanzar de fase automáticamente.

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
Aún no existen (se documentarán en Fase 1: `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm db:migrate`).
