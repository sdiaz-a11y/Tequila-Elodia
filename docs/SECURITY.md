# SECURITY — ELODIA OS

## Autenticación y sesiones

- Contraseñas con **argon2id**; política mínima (12+ caracteres), verificación contra contraseñas filtradas opcional.
- Sesión server-side: token aleatorio de 256 bits, se guarda solo su hash en `sessions`; cookie `httpOnly; Secure; SameSite=Lax`; expiración absoluta e inactividad; revocación y "cerrar todas las sesiones".
- Protección CSRF: `SameSite=Lax` + cabecera personalizada `X-Elodia-Csrf` en mutaciones + validación de `Origin` (implementado, Sprint 1.4).
- 2FA TOTP opcional, obligatorio para `tech_superadmin` y `director_vp` (propuesto).
- Bloqueo progresivo: tras el 5.º fallo consecutivo la cuenta se bloquea 1, 2, 4… min (máx. 60); mientras está bloqueada incluso la contraseña correcta falla, con la misma respuesta genérica 401. Rate limiting por IP en `POST /auth/login` (`LOGIN_RATE_LIMIT`, 5/min por defecto). Recuperación de acceso: sin proveedor de correo aún, un administrador restablece la contraseña (contraseña temporal de un solo uso, D26); el autoservicio llega con el correo.
- Respuestas de login indistinguibles (usuario inexistente / contraseña errónea / desactivado / bloqueado) y con coste de CPU equivalente (verificación ficticia).
- Sesión: token de 256 bits, solo su SHA-256 en BD; expiración absoluta (`SESSION_TTL_HOURS`, 12 h) e inactividad (`SESSION_IDLE_MINUTES`, 120 min); los permisos se releen en cada petición (un cambio de rol aplica de inmediato). Activar 2FA revoca las demás sesiones.
- 2FA TOTP (RFC 6238) opcional; secreto cifrado en reposo con AES-256-GCM (`APP_ENCRYPTION_KEY`). **No se usará** (D19, decisión del usuario); el código queda disponible pero sin exigirse.

## Autorización (RBAC por recurso, acción y alcance)

- Guard global **deny-by-default**: cada endpoint declara `@Requires('resource', 'action')`; sin decorador → 403.
- Alcance `own | team | all` resuelto en la capa de servicio/consulta (no solo en el controlador): las consultas incluyen siempre `organization_id` y el filtro de alcance.
- `external_distributor` limitado a datos de su `distributor_id`.
- IDs en URL/peticiones se validan contra el alcance del usuario (prevención de IDOR). Cada endpoint tiene test de autorización (permitido/denegado/otro alcance).
- La UI oculta lo no permitido, pero **nunca** es el control real.
- Acciones `approve` (descuentos, contenido, documentos) separadas de `update`.

## Datos y entrada

- Validación con Zod en el borde de la API; Prisma parametriza consultas (sin SQL concatenado).
- Salida escapada por React; sanitización de contenido rico si se admite.
- Subida de archivos: tipo/tamaño permitidos, escaneo opcional, almacenamiento privado, URLs prefirmadas de corta vida.
- Secretos de integraciones cifrados en reposo (clave maestra fuera de la BD).

## Plataforma

- Cabeceras de seguridad (Helmet/CSP), CORS restringido a orígenes conocidos, HTTPS obligatorio.
- Rate limiting global y por usuario/IP (Nest Throttler + Redis).
- Dependencias: `pnpm audit` en CI, versiones fijadas con lockfile.
- **Secretos**: solo en variables de entorno; `.env*` en `.gitignore`; solo `.env.example` sin valores reales. Nunca API keys en el frontend: la IA y conectores se llaman exclusivamente desde la API.
- Separación de entornos (dev/staging/prod) con credenciales y BD distintas; nunca datos reales en dev.

## Auditoría

- `audit_logs` append-only para: login/logout, cambios de rol/permiso, creación/edición/borrado de entidades sensibles, aprobaciones, exportaciones, uso de IA con escritura.
- Registro de antes/después, usuario, IP y fecha. El rol de BD de la app no tiene `UPDATE/DELETE` sobre `audit_logs`.

## IA

- Proveedor intercambiable; claves solo en backend.
- El asistente usa **herramientas del backend** con los permisos del usuario que consulta; sin acceso SQL directo.
- Toda acción que modifique datos exige confirmación explícita del usuario.
- `ai_usage_logs` + límites por usuario/organización; sin llamadas de pago hasta autorización.
- Contenido generado queda marcado `ai_generated` y pasa por aprobación humana.

## Cumplimiento (México)

- El sistema **no** declara que una pieza publicitaria o producto cumple la ley (publicidad de bebidas alcohólicas, NOM de tequila, etc.). Solo gestiona documentos, vencimientos y aprobaciones **humanas** registradas.
- Datos personales de contactos: aviso de privacidad y derechos ARCO a revisar con asesoría legal.

## Respaldo y recuperación

- Backups automáticos del proveedor de BD (PITR si está disponible) + respaldo lógico programado; **prueba de restauración documentada antes de producción**.
- Objetos S3 con versionado.

## Operaciones destructivas

Migraciones destructivas, borrados masivos, cambios de infraestructura y despliegues requieren autorización explícita.

## Administración de usuarios y permisos (Sprint 1.6)

- **Contraseña temporal** (D26): generada en el servidor con `crypto.randomInt`, 15 caracteres sin ambiguos (~85 bits), devuelta una sola vez y nunca guardada en claro ni escrita en la bitácora. `must_change_password` limita la sesión a cambiarla; al hacerlo se cierran las demás sesiones.
- **Cambio de contraseña**: exige la contraseña actual y los intentos fallidos alimentan el mismo bloqueo progresivo del login.
- **Anti-escalada** (D27): nadie concede lo que no tiene; los roles elevados y personalizados exigen poseer todos sus permisos; nadie cambia su propio rol/estado; el rol `tech_superadmin` es inmodificable y siempre queda al menos un superadmin activo.
- **Multi-tenant**: usuarios, roles y bitácora se consultan siempre con el `organization_id` del actor; un id de otra organización responde 404.
- **Deshabilitar/restablecer** revoca todas las sesiones del usuario en la misma transacción que el cambio y su registro de auditoría.
- **Permisos en caliente**: se releen en cada petición; editar la matriz aplica de inmediato.
- **Exportación CSV** (D29): neutraliza celdas que empiezan con `=`, `+`, `-` o `@`, no incluye secretos, se audita y se limita a 10,000 filas.
- **2FA**: no se usa (D19). Sin él, la defensa es la política de contraseñas, el bloqueo progresivo, el rate limit y la caducidad de sesión.
