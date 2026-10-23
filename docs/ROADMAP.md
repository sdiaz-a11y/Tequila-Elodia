# ROADMAP y backlog

## Orden de construcción

1. **Fase 0** — Arquitectura y documentación ✅ (esta entrega)
2. **Fase 1** — Fundación + MVP
3. **Fase 2** — Crecimiento (Content Studio, marketing, ventas, automatizaciones)
4. **Fase 3** — Operación avanzada (inventario, finanzas, BI, asistente IA, portal)

No se avanza de fase sin aprobación explícita.

## Backlog Fase 1 (sprints sugeridos, cada ítem = persistencia + validación + permisos + pruebas)

| Sprint | Entregable |
|---|---|
| 1.1 | Monorepo (pnpm + Turborepo), lint/format/tsc, CI, `.env.example`, config compartida |
| 1.2 | `packages/database`: Prisma + migración inicial (identidad, CRM base), seed de roles/permisos |
| 1.3 | API base: config, logging, errores RFC 7807, OpenAPI, rate limiting, auditoría |
| 1.4 | Auth: login, sesiones, logout, 2FA opcional, guard deny-by-default, tests de autorización |
| 1.5 | Web base: tema ELODIA, shell (sidebar, breadcrumbs, ⌘K), login, componentes (tabla, filtros, formularios, vacíos/errores) |
| 1.6 | Administración: usuarios, roles, matriz de permisos, bitácora |
| 1.7 | CRM: accounts, contacts, leads, pipeline configurable, oportunidades, actividades |
| 1.8 | Territorios + Expansión + Distribuidores |
| 1.9 | Proyectos y tareas (Kanban) |
| 1.10 | Catálogo (productos/variantes) y Brand Kit + archivos S3 |
| 1.11 | Dashboard inicial con datos reales/estados vacíos |
| 1.12 | E2E de flujos críticos (login, lead→oportunidad, permisos), documentación, cierre de fase |

## Definición de "terminado" (por módulo)
Esquema+migración · API con DTO/Zod · permisos por recurso/acción · auditoría de escrituras · UI completa (carga/vacío/error) · pruebas unitarias+integración · documentación actualizada · verificado ejecutando.

## Decisiones pendientes (requieren tu respuesta antes de Fase 1)

1. ~~PostgreSQL local~~ → **Resuelto: Supabase.** Proyecto creado y claves en `.env` local. Falta solo la contraseña de BD para `DATABASE_URL` / `DIRECT_URL`.
2. **Hosting objetivo**: `web` en **Vercel** (lo despliega el usuario). Pendiente: dónde corre `api`. Ver D10 en [DECISIONS.md](DECISIONS.md).
3. ~~Gestor de paquetes~~ → **Resuelto: pnpm.**
4. **Multi-organización**: ¿una sola organización (ELODIA) o preparar para varias? (el diseño ya soporta ambas; cambia UI de admin).
5. **Recursos oficiales de marca**: logotipo, tipografías y colores oficiales; hasta entonces se usa la paleta provisional.
6. **Idioma de la UI**: asumo español (México) con código en inglés. ¿Correcto?
7. **Usuarios iniciales y roles reales** (VP, equipo) para el seed; sin ello solo se crea el superadmin técnico.
8. **Moneda/impuestos**: MXN e IVA configurable (validar con contabilidad en Fase 2).
9. **Autenticación**: ¿suficiente email+contraseña+2FA opcional, o se requiere SSO (Google/Microsoft)?
10. **Fuente de datos existentes**: ¿hay prospectos/clientes/distribuidores en Excel/otro CRM para importar?
