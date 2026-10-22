# PROGRESS — ELODIA OS

**Fase actual:** Fase 1 — Sprint 1.1 (monorepo) completado; siguiente: 1.2 (Prisma + Supabase)
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
- Faltan pnpm, Docker, PostgreSQL y Redis en el equipo.
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
- Pendiente de 1.1: ESLint (hoy `lint` = tsc), CI en GitHub Actions.
