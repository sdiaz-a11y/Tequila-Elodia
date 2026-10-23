# API — Convenciones

Base: `/api/v1` · Formato JSON · Documentación interactiva OpenAPI en `/api/docs` (solo dev/staging) · Esquema exportado a `docs/openapi.json` en CI.

## Convenciones

- REST por recurso, sustantivos en plural, kebab-case: `/leads`, `/opportunities/{id}/activities`.
- Autenticación por cookie de sesión; toda mutación (POST/PUT/PATCH/DELETE) requiere la cabecera `X-Elodia-Csrf: 1` y, si el navegador envía `Origin`, debe estar en `WEB_ORIGIN`. Cookie `elodia_session` (`__Host-elodia_session` en producción): `HttpOnly`, `SameSite=Lax`, `Secure` en producción.
- Paginación: `?page=1&pageSize=25` → `{ "data": [...], "meta": { "page", "pageSize", "total" } }`. Máximo 100.
- Filtros: `?status=open&ownerId=…&q=texto&createdFrom=…&createdTo=…`; orden: `?sort=-createdAt`.
- Errores `application/problem+json`: `{ type, title, status, detail, code, errors?: [{path, message}] }`.
- Idempotencia: operaciones sensibles (pagos, conversión cotización→pedido) aceptan `Idempotency-Key`.
- Fechas ISO-8601 UTC; dinero como string decimal (`"1250.00"`) + `currency`.
- Versionado: cambios incompatibles → `/api/v2`.
- Códigos: 200/201/204, 400 validación, 401 sin sesión, 403 sin permiso, 404 (también para recursos fuera de alcance), 409 conflicto, 422 regla de negocio, 429 rate limit.

## Endpoints núcleo (Fase 1, esbozo)

| Área                | Rutas                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth (implementado) | `POST /auth/login` (límite `LOGIN_RATE_LIMIT`/min por IP) · `POST /auth/logout` · `POST /auth/logout-all` · `GET /auth/me` · `POST /auth/2fa/setup` · `POST /auth/2fa/enable` · `POST /auth/2fa/disable` |
| Cuenta (implementado) | `POST /auth/change-password` (contraseña actual + nueva; cierra las demás sesiones). Con contraseña temporal pendiente es, junto con `GET /auth/me` y `POST /auth/logout`, lo único permitido |
| Usuarios (implementado, `users:*`, alcance `all`) | `GET /users?q&status&roleId&page&pageSize` · `POST /users` (devuelve `temporaryPassword` una sola vez) · `PATCH /users/{id}` (nombre, rol, estado `active`/`disabled`) · `POST /users/{id}/reset-password` · `POST /users/{id}/unlock` |
| Roles (implementado, `roles:*`) | `GET /roles` · `GET /roles/{id}` (con su matriz) · `PUT /roles/{id}/permissions` (reemplaza la matriz) · `POST /roles/{id}/reset-defaults` |
| Auditoría (implementado, `audit:*`) | `GET /audit-logs?from&to&action&resource&userId&q&page&pageSize` · `GET /audit-logs/export.csv` (mismos filtros, máx. 10,000 filas, requiere `audit:export`) |
| CRM                 | `/accounts` · `/contacts` · `/leads` (+`POST /leads/{id}/convert`) · `/pipeline-stages` · `/opportunities` (+`POST /opportunities/{id}/move`) · `/activities`                                            |
| Red                 | `/territories` · `/distributors` · `/expansion-plans` (+`/updates`)                                                                                                                                      |
| Operación           | `/projects` · `/tasks` (+`/comments`)                                                                                                                                                                    |
| Producto/Marca      | `/products` · `/variants` · `/brand-kit` · `/brand-assets` · `/files/presign`                                                                                                                            |
| Dashboard           | `GET /dashboard/summary?from&to` (datos reales; vacío si no hay)                                                                                                                                         |

Cada endpoint declara su permiso `resource:action` (`@Requires('accounts','read')`). **Deny-by-default**: una ruta sin `@Public()`, `@Authenticated()` o `@Requires()` responde 403 aunque el usuario tenga sesión. Los errores 401 de login traen `code`: `totp_required` / `totp_invalid`.

Errores con `code` estable: `totp_required`, `totp_invalid`, `password_change_required` (403, la cuenta debe cambiar su contraseña temporal).

Health: `GET /health` (liveness) y `GET /health/ready` (BD), ambos públicos.
