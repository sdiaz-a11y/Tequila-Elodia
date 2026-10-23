# ELODIA OS

Plataforma privada de control para la comercialización y expansión de la marca ELODIA.
Una sola aplicación Next.js (`apps/web`) con **Supabase** (inicio de sesión + PostgreSQL con permisos por fila). No hay servidor aparte.

## Qué incluye hoy

- **Comercial**: empresas y prospectos, contactos, pipeline por etapas, actividades, territorios, distribuidores.
- **Dashboard** con cifras reales (vacío mientras no haya datos).
- **Contenido (sin IA)**: Brand Kit (paleta, tipografías, tono, mensajes y restricciones), biblioteca multimedia con archivos privados, calendario editorial y aprobaciones. Nada se publica sin revisión humana y, para aprobar, quien aprueba confirma la revisión de la normativa de publicidad de bebidas alcohólicas (la plataforma no valida ese cumplimiento).
- **Ventas**: cotizaciones y pedidos con líneas que guardan el precio, descuento e IVA del momento (cambiar la lista de precios después no los altera), descuentos mayores a 10 % solo con gerencia, conversión de cotización aceptada a pedido en una sola transacción, pagos con saldo controlado e impresión / PDF.
- **Operación**: proyectos, tablero de tareas, productos, presentaciones (SKU) con precio y costo, campañas con presupuesto y resultados.
- **Inventario**: almacenes, lotes y un libro de movimientos que solo se agrega (entradas, salidas, ajustes con motivo, apartados). Nunca hay existencias negativas ni se saca lo apartado para un pedido. Con la automatización activa, confirmar un pedido aparta el inventario, enviarlo lo descuenta y cancelarlo lo libera; el envío guarda paquetería y guía.
- **Automatizaciones**: interruptores (todos apagados al inicio) para reservar inventario, y dar seguimiento a cotizaciones enviadas y a prospectos nuevos; cada una se ejecuta una sola vez por evento.
- **Configuración**: etapas del pipeline editables.
- **Cumplimiento**: documentos (permisos, certificados, contratos) con vencimiento y aprobación humana; el panel avisa de los que vencen en 30 días.
- **Finanzas**: ingresos y egresos con balance del mes (solo lo ve quien administra el dinero).
- **Equipo**: alta de usuarios con contraseña temporal de un solo uso, roles, deshabilitar y restablecer.
- **Auditoría**: cada alta, cambio y borrado queda registrado por la base de datos y no se puede editar.
- Marca y diseño: `docs/brand-reference.json`, `assets/brand/official/`.

Pendiente (aparece en el menú como "Próximamente"): Content Studio con IA, redes sociales, planeación estratégica, BI, asistente IA, automatizaciones e integraciones.

## Cómo funciona la seguridad

Los permisos **viven en la base de datos** (Row Level Security, `supabase/migrations/0001_comercial.sql`), no en la pantalla. Aunque alguien use la clave pública directamente contra Supabase, solo puede hacer lo que su rol permite. Roles: lectura = equipo interno · crear/editar = comercial · borrar = gerencia · equipo y auditoría = dirección y administración.

## Ponerlo a andar

```bash
pnpm install
# apps/web/.env.local  (nunca se sube a git; ver .env.example)
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
#   SUPABASE_SECRET_KEY=...        (solo servidor: crea usuarios desde Equipo)
# .env en la raíz: DIRECT_URL=...  (conexión directa a Postgres, solo para migraciones)
node scripts/db-apply.mjs          # aplica supabase/migrations a la base
node scripts/seed-brand-assets.mjs # sube las imágenes oficiales de assets/brand/official (una vez)
ADMIN_EMAIL=... ADMIN_PW=... node scripts/rls-check.mjs   # ataca la base con la clave pública y verifica los permisos (repetir al cambiar reglas)
pnpm dev                           # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

El primer usuario (superadmin) se crea con la API de administración de Supabase con `app_metadata: { role: 'tech_superadmin' }`; el rol de los demás se asigna desde Equipo.

## Vercel

Un solo proyecto: **Root Directory = `apps/web`**, y estas variables en Settings → Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. En Supabase → Authentication, desactiva el registro público de usuarios.
