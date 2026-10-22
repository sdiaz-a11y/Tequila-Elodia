# API — Convenciones

Base: `/api/v1` · Formato JSON · Documentación interactiva OpenAPI en `/api/docs` (solo dev/staging) · Esquema exportado a `docs/openapi.json` en CI.

## Convenciones
- REST por recurso, sustantivos en plural, kebab-case: `/leads`, `/opportunities/{id}/activities`.
- Autenticación por cookie de sesión; mutaciones requieren cabecera `X-CSRF-Token`.
- Paginación: `?page=1&pageSize=25` → `{ "data": [...], "meta": { "page", "pageSize", "total" } }`. Máximo 100.
- Filtros: `?status=open&ownerId=…&q=texto&createdFrom=…&createdTo=…`; orden: `?sort=-createdAt`.
- Errores `application/problem+json`: `{ type, title, status, detail, code, errors?: [{path, message}] }`.
- Idempotencia: operaciones sensibles (pagos, conversión cotización→pedido) aceptan `Idempotency-Key`.
- Fechas ISO-8601 UTC; dinero como string decimal (`"1250.00"`) + `currency`.
- Versionado: cambios incompatibles → `/api/v2`.
- Códigos: 200/201/204, 400 validación, 401 sin sesión, 403 sin permiso, 404 (también para recursos fuera de alcance), 409 conflicto, 422 regla de negocio, 429 rate limit.

## Endpoints núcleo (Fase 1, esbozo)

| Área | Rutas |
|---|---|
| Auth | `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `POST /auth/2fa/*` |
| IAM | `/users` · `/roles` · `/permissions` · `/audit-logs` (GET) |
| CRM | `/accounts` · `/contacts` · `/leads` (+`POST /leads/{id}/convert`) · `/pipeline-stages` · `/opportunities` (+`POST /opportunities/{id}/move`) · `/activities` |
| Red | `/territories` · `/distributors` · `/expansion-plans` (+`/updates`) |
| Operación | `/projects` · `/tasks` (+`/comments`) |
| Producto/Marca | `/products` · `/variants` · `/brand-kit` · `/brand-assets` · `/files/presign` |
| Dashboard | `GET /dashboard/summary?from&to` (datos reales; vacío si no hay) |

Cada endpoint declara su permiso `resource:action` en OpenAPI (`x-permission`).
