# MODULES — Módulos, dependencias y navegación

## Matriz de módulos

| # | Módulo | Fase | Depende de | Notas |
|---|---|---|---|---|
| — | Core/IAM/Auth | 1 | — | Base de todo |
| 01 | Dashboard ejecutivo | 1 (básico) | CRM, expansión, proyectos | Solo datos reales; estados vacíos |
| 02 | Planeación estratégica | 2 | iam | Objetivos/metas; vinculada a dashboard |
| 03 | CRM comercial | 1 | iam | Núcleo del MVP |
| 04 | Ventas | 2 | CRM, catálogo | Snapshot de precios/impuestos |
| 05 | Distribuidores | 1 | CRM (accounts), expansión | `distributors.account_id` único |
| 06 | Expansión territorial | 1 | iam | Mapa en F1 simple (lista/árbol); mapa geográfico después |
| 07 | Productos e inventario | catálogo 1 / inventario 3 | — | Sin productos ni precios inventados |
| 08 | Content Studio IA | 2 | brand, files, IA | Biblioteca de marca en F1 |
| 09 | Marketing | 2 | content, CRM | Conectores sociales preparados |
| 10 | Finanzas | 3 | ventas, marketing | Impuestos configurables |
| 11 | Proyectos y equipo | 1 | iam | Kanban + tareas |
| 12 | Documentación y cumplimiento | 3 | files | Aprobación humana siempre |
| 13 | Business Intelligence | 3 | todos (lectura) | CSV/PDF |
| 14 | Asistente IA | 3 | todos vía servicios | Tools con permisos del usuario |
| 15 | Automatizaciones | 2 básicas | eventos | Idempotencia |

## Mapa de navegación (sidebar)

```text
Inicio
  └ Dashboard                       /dashboard
Comercial
  ├ Prospectos                      /crm/leads
  ├ Empresas                        /crm/accounts
  ├ Contactos                       /crm/contacts
  ├ Pipeline                        /crm/pipeline
  ├ Oportunidades                   /crm/opportunities
  ├ Actividades                     /crm/activities
  └ Ventas (F2)                     /sales/quotes · /sales/orders · /sales/price-lists · /sales/payments
Red
  ├ Distribuidores                  /distributors, /distributors/[id]
  └ Expansión                       /expansion/map · /markets · /cities · /plans · /alliances
Producto
  ├ Catálogo                        /catalog/products · /variants
  └ Inventario (F3)                 /inventory/warehouses · /stock · /lots · /movements
Marca y contenido
  ├ Brand Kit                       /brand
  └ Content Studio (F2)             /studio/…  (ideas, guiones, copies, biblioteca, calendario, aprobaciones)
Marketing (F2)                      /marketing/campaigns · /calendar · /channels · /budgets · /results
Finanzas (F3)                       /finance/…
Operación
  ├ Proyectos                       /projects · /projects/[id]/board
  ├ Tareas                          /tasks
  └ Equipo                          /team
Cumplimiento (F3)                   /compliance/…
Inteligencia (F3)                   /bi/… · /assistant
Automatizaciones (F2)               /automations
Administración                      /admin/users · /admin/roles · /admin/audit · /admin/settings
```

La visibilidad de cada entrada depende de permisos `read` del recurso (la API es la autoridad).

## Catálogo de permisos (recursos)

`accounts, contacts, leads, opportunities, activities, pipeline_stages, quotes, orders, payments, price_lists, products, variants, inventory, distributors, territories, expansion_plans, brand, content, campaigns, budgets, expenses, projects, tasks, compliance, reports, assistant, automations, users, roles, audit, settings`
× acciones `read | create | update | delete | approve | export` × alcance `own | team | all`.

Matriz inicial rol→permisos se define en `packages/shared/permissions.ts` (Fase 1) y se documenta en [SECURITY.md](SECURITY.md).
