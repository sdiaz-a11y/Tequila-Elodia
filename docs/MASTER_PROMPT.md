# Prompt maestro — ELODIA OS (texto original, sin cambios)

> Este es el prompt con el que se encarga el proyecto. Se guarda aquí para poder retomar el trabajo en cualquier equipo. El estado real de avance está en [HANDOFF.md](HANDOFF.md) y [PROGRESS.md](PROGRESS.md). Nota: la numeración de fases del prompt (sección 11) difiere del backlog de [ROADMAP.md](ROADMAP.md); se sigue el ROADMAP (ver [DECISIONS.md](DECISIONS.md), "Notas de fases").

---

# PROMPT MAESTRO — ELODIA OS

## Plataforma integral de dirección, comercialización, marketing y expansión de marca

### 1. TU ROL

Actúa como un equipo senior de desarrollo de software compuesto por:

- Arquitecto de software empresarial.
- Desarrollador Full-Stack Senior.
- Especialista en PostgreSQL y diseño de bases de datos.
- Diseñador UI/UX especializado en plataformas SaaS premium.
- Ingeniero de automatización e inteligencia artificial.
- Especialista en seguridad, integraciones y escalabilidad.
- Product Manager técnico.

Tu responsabilidad es diseñar y desarrollar **ELODIA OS**, una plataforma web empresarial de alta calidad, completamente funcional, mantenible y escalable.

No quiero una demostración visual con botones decorativos. Quiero una aplicación real con persistencia de datos, reglas de negocio, autenticación, permisos, validaciones y funcionalidades operativas.

**Regla principal: antes de programar, inspecciona el repositorio y prepara la arquitectura. No implementes todo simultáneamente.**

---

# 2. CONTEXTO DEL NEGOCIO

**ELODIA** es una marca mexicana de tequila premium.

La marca fue lanzada por un influencer de negocios y su expansión comercial está a cargo de su VP, quien será el principal responsable de la dirección estratégica y operativa del producto.

La plataforma debe ayudarlo a administrar:

1. Dirección y estrategia de la marca.
2. Prospección comercial.
3. Clientes y distribuidores.
4. Ventas, cotizaciones y pedidos.
5. Expansión nacional e internacional.
6. Alianzas estratégicas.
7. Marketing y campañas.
8. Creación de contenido con inteligencia artificial.
9. Redes sociales.
10. Productos, inventario y logística.
11. Finanzas y presupuestos.
12. Proyectos, tareas y equipos.
13. Documentación y cumplimiento.
14. Reportes e inteligencia empresarial.
15. Automatizaciones y asistente ejecutivo IA.

No asumir que ELODIA fabrica directamente el tequila. El modelo de producción y las responsabilidades sobre almacenes, facturación y logística deben ser configurables.

**Objetivo:** convertir ELODIA OS en el centro de control de todas las operaciones de crecimiento de la marca.

---

# 3. PRINCIPIOS DE DESARROLLO

Cumple estas reglas durante todo el proyecto:

- Código limpio, modular y tipado.
- Arquitectura escalable sin complejidad innecesaria.
- Componentes reutilizables.
- Separación entre interfaz, lógica de negocio y persistencia.
- Base de datos relacional normalizada.
- API con validaciones.
- Seguridad desde el inicio.
- Interfaz responsive.
- Accesibilidad y estados de carga, error y vacío.
- Persistencia real de información.
- Auditoría de acciones importantes.
- Pruebas automatizadas para lógica crítica.
- No inventar datos empresariales reales.
- No usar información ficticia como si fuera de producción.
- No dejar botones sin funcionalidad.
- No instalar dependencias innecesarias.
- No modificar archivos existentes sin revisar su propósito.
- No exponer credenciales ni secretos.
- No ejecutar despliegues, pagos o acciones externas sin autorización.

Si una funcionalidad requiere credenciales, servicios externos o decisiones pendientes, implementar una interfaz de integración desacoplada y documentar claramente lo que falta.

---

# 4. STACK TECNOLÓGICO

Utiliza preferentemente:

**Frontend**
- Next.js con App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Lucide Icons.
- Recharts.
- React Hook Form.
- Zod.

**Backend**
- NestJS.
- TypeScript.
- API REST.
- Validación de solicitudes.
- OpenAPI/Swagger.

**Base de datos**
- PostgreSQL.
- Prisma ORM.
- Migraciones versionadas.

**Autenticación**
- Sistema de autenticación seguro.
- Roles y permisos.
- Sesiones protegidas.
- Recuperación de acceso.

**Almacenamiento**
- Cloudflare R2 o almacenamiento compatible con S3.

**Automatización**
- BullMQ y Redis para trabajos internos.
- n8n únicamente cuando aporte valor a integraciones externas.

**IA**
- Arquitectura independiente del proveedor.
- Configuración mediante variables de entorno.
- Registro de solicitudes, costos y errores.
- Límites de uso configurables.

**Herramientas**
- Git.
- ESLint.
- Prettier.
- Vitest o Jest.
- Playwright para pruebas end-to-end.

Utiliza un monorepo con pnpm workspaces.

Antes de instalar dependencias, comprueba las versiones estables compatibles con el entorno disponible.

---

# 5. BRANDING Y DISEÑO VISUAL

La plataforma debe utilizar la identidad visual de ELODIA.

## Personalidad

- Lujo premium.
- Elegancia.
- Exclusividad.
- Sofisticación.
- Tradición mexicana.
- Modernidad tecnológica.
- Diseño editorial.

## Paleta inicial

- Fondo principal: `#101012`
- Fondo secundario: `#211E1C`
- Dorado principal: `#D8B777`
- Dorado secundario: `#B8924F`
- Texto principal: `#F5EBDD`
- Texto secundario: `#B9B1A4`
- Blanco: `#FFFFFF`

Los colores son una interpretación visual inicial de la fotografía de marca y deben quedar centralizados como design tokens editables.

## Reglas visuales

1. Dark mode como identidad principal.
2. Sidebar elegante y minimalista.
3. Tarjetas con bordes discretos.
4. Botones principales con acentos dorados.
5. Tablas empresariales modernas y legibles.
6. Gráficas limpias.
7. Formularios profesionales.
8. Animaciones sutiles.
9. Evitar saturación de efectos.
10. Mantener excelente contraste.
11. Utilizar la fotografía oficial de la botella cuando esté disponible.
12. No inventar ni reinterpretar el logotipo oficial.

La plataforma debe sentirse como un software empresarial premium, no como una landing page.

---

# 6. ESTRUCTURA DE NAVEGACIÓN

Crear un layout principal con:

- Sidebar colapsable.
- Header superior.
- Buscador global.
- Notificaciones.
- Acciones rápidas.
- Perfil del usuario.
- Breadcrumbs.
- Selector de periodo.
- Área principal de contenido.

## Menú

### DIRECCIÓN
- Dashboard ejecutivo.
- Planeación estratégica.
- Business Intelligence.

### COMERCIAL
- CRM.
- Oportunidades.
- Cotizaciones.
- Pedidos.
- Distribuidores.
- Expansión territorial.

### MARKETING
- Content Studio IA.
- Calendario editorial.
- Campañas.
- Redes sociales.
- Biblioteca multimedia.

### OPERACIONES
- Productos.
- Inventario.
- Logística.
- Documentación y cumplimiento.

### ADMINISTRACIÓN
- Finanzas.
- Proyectos.
- Equipo.
- Usuarios y permisos.

### INTELIGENCIA
- Asistente ejecutivo.
- Automatizaciones.
- Reportes.

### SISTEMA
- Configuración.
- Integraciones.
- Auditoría.

La navegación debe respetar los permisos del usuario.

---

# 7. MÓDULOS FUNCIONALES

## MÓDULO 1 — DASHBOARD EJECUTIVO

Crear un panel con:

- Ventas del periodo.
- Ventas contra objetivo.
- Oportunidades activas.
- Valor del pipeline.
- Distribuidores activos.
- Nuevos puntos de venta.
- Campañas activas.
- Presupuesto utilizado.
- Tareas pendientes.
- Alertas importantes.
- Actividad reciente.

Permitir filtros por fechas, territorios, productos y responsables.

Los indicadores deben calcularse a partir de datos reales.

Cuando no existan datos, mostrar estados vacíos claros.

## MÓDULO 2 — PLANEACIÓN ESTRATÉGICA

Funciones:

- Crear objetivos.
- Definir metas medibles.
- Asignar responsables.
- Crear iniciativas.
- Establecer presupuestos.
- Gestionar fechas límite.
- Relacionar proyectos con objetivos.
- Medir cumplimiento.
- Visualizar roadmap.

## MÓDULO 3 — CRM

Entidades:

- Leads.
- Contactos.
- Empresas.
- Oportunidades.
- Actividades.
- Notas.
- Documentos.

Funciones:

- Crear y editar prospectos.
- Asignar responsables.
- Pipeline Kanban.
- Filtros avanzados.
- Búsqueda.
- Etiquetas.
- Historial.
- Seguimientos.
- Recordatorios.
- Importación CSV.
- Exportación CSV respetando permisos.

En cada contacto agregar acciones para copiar teléfono y abrir WhatsApp, cuando exista un número válido.

## MÓDULO 4 — VENTAS

Funciones:

- Cotizaciones.
- Productos y cantidades.
- Precios por canal.
- Descuentos autorizados.
- Pedidos.
- Estados de pedidos.
- Pagos y saldos.
- Historial comercial.
- Documentos descargables.

Preparar una integración desacoplada para facturación mexicana.

No implementar cálculos fiscales arbitrarios. Los impuestos deben configurarse y validarse con responsables fiscales.

## MÓDULO 5 — DISTRIBUIDORES

Funciones:

- Registro de distribuidores.
- Contactos.
- Territorios.
- Contratos.
- Condiciones comerciales.
- Pedidos.
- Objetivos.
- Historial.
- Evaluación de desempeño.

Evitar registros duplicados entre distribuidores y CRM.

## MÓDULO 6 — EXPANSIÓN TERRITORIAL

Crear:

- Directorio de mercados.
- Países, estados y ciudades.
- Territorios activos y potenciales.
- Prospectos por territorio.
- Distribuidores potenciales.
- Planes de entrada.
- Presupuestos.
- Responsables.
- Etapas de negociación.
- Metas comerciales.
- Indicadores regionales.

Incluir visualización geográfica cuando existan ubicaciones válidas.

## MÓDULO 7 — PRODUCTOS E INVENTARIO

Funciones:

- Catálogo de productos.
- Variantes y presentaciones.
- SKU.
- Fotografías.
- Fichas técnicas.
- Listas de precios.
- Almacenes.
- Existencias.
- Lotes.
- Entradas y salidas.
- Reservas.
- Alertas de inventario.

Separar inventario físico, reservado y disponible.

No permitir inconsistencias de existencias.

## MÓDULO 8 — CONTENT STUDIO IA

Este será uno de los módulos más importantes.

Crear las siguientes secciones:

### Brand Kit
- Logotipo oficial.
- Colores.
- Tipografías.
- Fotografías.
- Tono de comunicación.
- Manual de marca.
- Referencias.
- Productos.
- Restricciones creativas.

### Ideas
- Crear ideas de contenido.
- Organizar por campaña.
- Seleccionar objetivo.
- Elegir plataforma.
- Elegir formato.
- Guardar versiones.

### Guiones
- Generar guiones asistidos por IA.
- Editar.
- Guardar versiones.
- Asignar responsables.
- Aprobar o rechazar.

### Producción visual
- Gestionar briefs.
- Generar prompts.
- Conectar proveedores de generación de imágenes y videos.
- Guardar recursos.
- Versionar entregables.

### Calendario editorial
- Vista mensual.
- Vista semanal.
- Vista de lista.
- Estado de cada publicación.
- Responsable.
- Fecha.
- Plataforma.
- Archivos asociados.

### Aprobaciones
Estados:

Borrador → En revisión → Correcciones → Aprobado → Programado → Publicado.

Incluir revisión de cumplimiento publicitario para bebidas alcohólicas y protección de audiencias menores de edad.

No publicar automáticamente contenido sin autorización y sin una integración compatible.

## MÓDULO 9 — MARKETING

Funciones:

- Campañas.
- Objetivos.
- Canales.
- Presupuestos.
- Calendario.
- Piezas de contenido.
- Colaboradores.
- Resultados.
- Leads atribuidos.
- Costos.
- Reportes.

Preparar integraciones futuras con Meta y Google.

## MÓDULO 10 — FINANZAS

Funciones:

- Ingresos.
- Egresos.
- Presupuestos.
- Cuentas por cobrar.
- Costos.
- Márgenes.
- Rentabilidad por producto.
- Rentabilidad por territorio.
- Proyecciones.

Registrar fuentes de datos y fechas de actualización.

## MÓDULO 11 — PROYECTOS Y EQUIPO

Funciones:

- Proyectos.
- Tareas.
- Subtareas.
- Responsables.
- Prioridades.
- Estados.
- Fechas.
- Comentarios.
- Archivos.
- Vista Kanban.
- Vista calendario.
- Vista lista.

Relacionar proyectos con campañas, territorios y objetivos.

## MÓDULO 12 — DOCUMENTACIÓN Y CUMPLIMIENTO

Funciones:

- Expediente de marca.
- Expedientes de productos.
- Documentos de certificación.
- Contratos.
- Documentos de lotes.
- Permisos.
- Vencimientos.
- Historial de versiones.
- Responsables.
- Aprobaciones.

La plataforma debe facilitar el control documental, no sustituir asesoría legal o regulatoria.

## MÓDULO 13 — BUSINESS INTELLIGENCE

Funciones:

- Reportes dinámicos.
- Comparaciones por periodos.
- Resultados por vendedor.
- Resultados por distribuidor.
- Resultados por territorio.
- Análisis por canal.
- Exportación CSV.
- Reportes PDF.
- Indicadores históricos.

## MÓDULO 14 — ASISTENTE EJECUTIVO IA

Permitir preguntas como:

- ¿Cuáles son las oportunidades más importantes?
- ¿Qué distribuidores necesitan seguimiento?
- ¿Cómo van las ventas este mes?
- ¿Qué campañas están funcionando?
- ¿Qué territorios necesitan atención?
- Resume las actividades de esta semana.
- Genera un reporte ejecutivo.

El asistente solo debe acceder a datos autorizados.

No inventar cifras ni afirmar haber consultado información que no esté disponible.

Las acciones que modifiquen datos deben requerir autorización explícita.

## MÓDULO 15 — AUTOMATIZACIONES

Crear un sistema de eventos y acciones:

- Nuevo lead → asignar responsable.
- Cotización pendiente → recordatorio.
- Pedido confirmado → solicitar reserva de stock.
- Stock bajo → alerta.
- Documento próximo a vencer → notificación.
- Contenido aprobado → habilitar programación.
- Tarea vencida → aviso.
- Negociación sin actividad → seguimiento.

Registrar cada ejecución, errores y reintentos.

---

# 8. MODELO DE DATOS

Diseñar el esquema relacional completo antes de implementar funcionalidades.

Entidades iniciales:

- Organization
- User
- Role
- Permission
- Account
- Contact
- Lead
- Opportunity
- Activity
- Quote
- QuoteItem
- Order
- OrderItem
- Payment
- Product
- ProductVariant
- PriceList
- Warehouse
- InventoryLot
- InventoryMovement
- StockReservation
- Distributor
- Territory
- Campaign
- ContentProject
- ContentAsset
- ContentVersion
- ContentApproval
- SocialPublication
- StrategicGoal
- Project
- Task
- ComplianceDocument
- Notification
- Automation
- AutomationRun
- AuditLog

Definir claves primarias, foráneas, índices, restricciones, relaciones y políticas de eliminación.

Evitar duplicidad de clientes y distribuidores.

Preparar soporte para varias organizaciones, aunque inicialmente se utilice ELODIA.

---

# 9. ROLES Y PERMISOS

Crear estos roles iniciales:

1. Superadministrador técnico.
2. Dirección general.
3. Gerente comercial.
4. Vendedor.
5. Marketing.
6. Operaciones.
7. Finanzas.
8. Colaborador.
9. Distribuidor externo.

Implementar autorización en backend, no solamente ocultar elementos en frontend.

Restringir acceso a datos financieros, credenciales, información comercial sensible y registros de otras organizaciones.

---

# 10. REQUISITOS NO FUNCIONALES

La plataforma debe:

- Funcionar correctamente en escritorio, tablet y móvil.
- Tener manejo de errores.
- Validar formularios.
- Mostrar indicadores de carga.
- Permitir paginación.
- Utilizar filtros reutilizables.
- Tener búsqueda eficiente.
- Soportar exportaciones.
- Registrar auditoría.
- Tener backups.
- Utilizar variables de entorno.
- Evitar secretos en el repositorio.
- Tener protección contra accesos no autorizados.
- Utilizar migraciones controladas.
- Incluir pruebas para flujos críticos.

---

# 11. FASES DE IMPLEMENTACIÓN

## FASE 0 — Arquitectura

Antes de programar:

1. Inspeccionar el proyecto.
2. Revisar herramientas instaladas.
3. Identificar dependencias.
4. Diseñar arquitectura.
5. Diseñar base de datos.
6. Definir módulos.
7. Definir rutas.
8. Definir roles.
9. Definir roadmap.
10. Documentar decisiones.

Crear:

- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/MODULES.md`
- `docs/ROADMAP.md`
- `docs/BRANDING.md`
- `docs/DECISIONS.md`

No comenzar las siguientes fases hasta presentar un resumen de arquitectura y recibir aprobación.

## FASE 1 — Fundamentos

- Monorepo.
- Configuración.
- Autenticación.
- Base de datos.
- Layout.
- Sidebar.
- Design system.
- Roles.
- Usuarios.
- Auditoría.

## FASE 2 — Núcleo comercial

- CRM.
- Contactos.
- Empresas.
- Oportunidades.
- Pipeline.
- Distribuidores.
- Territorios.
- Tareas.
- Dashboard inicial.

## FASE 3 — Marketing

- Brand Kit.
- Biblioteca multimedia.
- Ideas.
- Guiones.
- Calendario.
- Campañas.
- Aprobaciones.

## FASE 4 — Operación

- Productos.
- Cotizaciones.
- Pedidos.
- Inventario.
- Logística.
- Finanzas.

## FASE 5 — Inteligencia

- Reportes.
- Integraciones.
- Automatizaciones.
- Asistente IA.
- Optimización.

Cada fase debe quedar funcional antes de iniciar la siguiente.

---

# 12. FORMA DE TRABAJAR EN CLAUDE CODE

Sigue este procedimiento:

1. Analiza el estado actual del repositorio.
2. Explica brevemente qué vas a implementar.
3. Identifica los archivos afectados.
4. Realiza cambios pequeños y coherentes.
5. Ejecuta las validaciones disponibles.
6. Corrige errores.
7. Resume los cambios.
8. Indica cómo probarlos.
9. Actualiza la documentación.
10. Solicita aprobación antes de avanzar a otra fase importante.

No reconstruyas funcionalidades existentes sin necesidad.

No generes miles de líneas de código sin verificar su funcionamiento.

Cuando una decisión tenga implicaciones importantes, presenta opciones y recomienda una.

No afirmes que algo funciona si no has podido probarlo.

---

# 13. CRITERIOS DE ACEPTACIÓN

Una funcionalidad se considera terminada cuando:

- La interfaz está implementada.
- Los datos se guardan correctamente.
- Se pueden consultar y modificar según permisos.
- Las validaciones funcionan.
- Los errores están controlados.
- La interfaz es responsive.
- No hay botones decorativos.
- Las pruebas relevantes pasan.
- La documentación está actualizada.

No marcar como terminado un módulo con datos simulados, salvo que se identifique expresamente como prototipo.

---

# 14. INSTRUCCIÓN INICIAL

Comienza ahora con la **FASE 0: ARQUITECTURA**.

Primero inspecciona el repositorio y el entorno de desarrollo.

Si el repositorio está vacío, prepara la propuesta de estructura inicial.

Después:

1. Diseña la arquitectura de ELODIA OS.
2. Define el monorepo.
3. Propón el esquema de base de datos.
4. Define los módulos y dependencias.
5. Establece el diseño visual.
6. Define las rutas principales.
7. Crea la documentación inicial.
8. Presenta el roadmap de implementación.

**No empieces a programar todos los módulos todavía.**

Al terminar la Fase 0, muéstrame un resumen de lo diseñado, las decisiones pendientes y el siguiente paso recomendado.

Espera mi aprobación antes de comenzar la Fase 1.

**Objetivo final: construir una plataforma empresarial real, elegante, segura y escalable para dirigir y expandir ELODIA.**
