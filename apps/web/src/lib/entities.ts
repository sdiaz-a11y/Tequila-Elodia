import { z } from 'zod';
import { CHANNELS, FORMATS } from '@/lib/content';

/**
 * Declarative description of every commercial entity. Plain data (no functions) so it can cross the
 * server/client boundary: the same definition drives the table, the form and the server-side validation.
 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'relation'
  | 'email'
  | 'tel'
  | 'url'
  | 'checkbox';

export type RelationKey =
  | 'accounts'
  | 'territories'
  | 'profiles'
  | 'stages'
  | 'opportunities'
  | 'assets'
  | 'projects'
  | 'products'
  | 'campaigns';

export interface Option {
  value: string;
  label: string;
}

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: readonly Option[];
  relation?: RelationKey;
  hint?: string;
  /** Whole numbers only (e.g. millilitres). */
  integer?: boolean;
  max?: number;
  /** Value used when a numeric field is left blank (for columns that cannot be null, like a budget). */
  blankAs?: number;
  /** Left out of the form when editing (identity of the row, e.g. the company of a distributor). */
  lockOnEdit?: boolean;
}

export interface Column {
  /** Dot path into the row, e.g. `owner.name`. */
  path: string;
  label: string;
  as?: 'text' | 'badge' | 'money' | 'date' | 'datetime' | 'bool' | 'expiry';
  /** Maps a raw value to a label (and tone for badges). */
  options?: readonly Option[];
}

export interface EntityDef {
  key: EntityKey;
  table: string;
  singular: string;
  plural: string;
  /** Spanish article agreement for messages: "Nueva empresa" / "Nuevo contacto". */
  isFeminine: boolean;
  fields: readonly Field[];
  columns: readonly Column[];
  /** PostgREST select, including embedded relations. */
  select: string;
  search: readonly string[];
  filters: readonly { name: string; label: string; options: readonly Option[] }[];
  order: { column: string; ascending: boolean };
  softDelete?: boolean;
  empty: { title: string; description: string };
}

export type EntityKey =
  | 'accounts'
  | 'contacts'
  | 'opportunities'
  | 'activities'
  | 'territories'
  | 'distributors'
  | 'content_items'
  | 'projects'
  | 'tasks'
  | 'products'
  | 'variants'
  | 'campaigns'
  | 'compliance_documents'
  | 'transactions';

const opts = (...pairs: [string, string][]): Option[] =>
  pairs.map(([value, label]) => ({ value, label }));

export const ACCOUNT_TYPES = opts(
  ['prospect', 'Prospecto'],
  ['client', 'Cliente'],
  ['distributor', 'Distribuidor'],
  ['partner', 'Aliado'],
  ['supplier', 'Proveedor'],
);
const ACCOUNT_STATUS = opts(['active', 'Activa'], ['inactive', 'Inactiva']);
const TERRITORY_KINDS = opts(
  ['country', 'País'],
  ['state', 'Estado'],
  ['city', 'Ciudad'],
  ['region', 'Región'],
);
const ACTIVITY_KINDS = opts(
  ['call', 'Llamada'],
  ['meeting', 'Reunión'],
  ['email', 'Correo'],
  ['note', 'Nota'],
  ['task', 'Tarea'],
);
export const DISTRIBUTOR_STATUS = opts(
  ['prospecting', 'En prospección'],
  ['negotiating', 'En negociación'],
  ['active', 'Activo'],
  ['paused', 'En pausa'],
  ['terminated', 'Terminado'],
);

export const PROJECT_STATUS = opts(
  ['active', 'Activo'],
  ['paused', 'En pausa'],
  ['done', 'Terminado'],
  ['cancelled', 'Cancelado'],
);
export const TASK_STATUS = opts(
  ['todo', 'Por hacer'],
  ['doing', 'En curso'],
  ['blocked', 'Bloqueada'],
  ['done', 'Hecha'],
);
export const TASK_PRIORITY = opts(
  ['low', 'Baja'],
  ['medium', 'Media'],
  ['high', 'Alta'],
  ['urgent', 'Urgente'],
);
const PRODUCT_STATUS = opts(['draft', 'Borrador'], ['active', 'Activo'], ['inactive', 'Inactivo']);
const CAMPAIGN_STATUS = opts(
  ['planned', 'Planeada'],
  ['active', 'Activa'],
  ['paused', 'En pausa'],
  ['done', 'Terminada'],
);

export const DOC_CATEGORIES = opts(
  ['brand', 'Marca'],
  ['product', 'Producto'],
  ['contract', 'Contrato'],
  ['permit', 'Permiso'],
  ['certificate', 'Certificado'],
  ['other', 'Otro'],
);
export const DOC_STATUS = opts(
  ['draft', 'Borrador'],
  ['in_review', 'En revisión'],
  ['approved', 'Aprobado'],
);
const TX_KINDS = opts(['income', 'Ingreso'], ['expense', 'Egreso']);

export const ENTITIES: Record<EntityKey, EntityDef> = {
  compliance_documents: {
    key: 'compliance_documents',
    table: 'compliance_documents',
    singular: 'documento',
    plural: 'Documentación y cumplimiento',
    isFeminine: false,
    select:
      '*, product:products!product_id(name), account:accounts!account_id(name), asset:brand_assets!asset_id(title)',
    search: ['title'],
    order: { column: 'expires_on', ascending: true },
    filters: [
      { name: 'category', label: 'Todas las categorías', options: DOC_CATEGORIES },
      { name: 'status', label: 'Todos los estados', options: DOC_STATUS },
    ],
    fields: [
      { name: 'title', label: 'Documento', type: 'text', required: true },
      {
        name: 'category',
        label: 'Categoría',
        type: 'select',
        required: true,
        options: DOC_CATEGORIES,
      },
      {
        name: 'status',
        label: 'Estado inicial',
        type: 'select',
        required: true,
        lockOnEdit: true,
        options: opts(['draft', 'Borrador'], ['in_review', 'Enviar a revisión']),
      },
      { name: 'expires_on', label: 'Vence el', type: 'date', hint: 'Déjalo vacío si no caduca.' },
      {
        name: 'asset_id',
        label: 'Archivo (sube el PDF en la biblioteca)',
        type: 'relation',
        relation: 'assets',
      },
      { name: 'product_id', label: 'Producto relacionado', type: 'relation', relation: 'products' },
      {
        name: 'account_id',
        label: 'Empresa o proveedor relacionado',
        type: 'relation',
        relation: 'accounts',
      },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { path: 'title', label: 'Documento' },
      { path: 'category', label: 'Categoría', as: 'badge', options: DOC_CATEGORIES },
      { path: 'status', label: 'Estado', as: 'badge', options: DOC_STATUS },
      { path: 'expires_on', label: 'Vence', as: 'expiry' },
      { path: 'product.name', label: 'Producto' },
    ],
    empty: {
      title: 'Aún no hay documentos',
      description:
        'Registra permisos, certificados y contratos con su fecha de vencimiento. Una persona autorizada los aprueba.',
    },
  },
  transactions: {
    key: 'transactions',
    table: 'transactions',
    singular: 'movimiento',
    plural: 'Finanzas',
    isFeminine: false,
    select: '*, account:accounts!account_id(name), campaign:campaigns!campaign_id(name)',
    search: ['category', 'description'],
    order: { column: 'occurred_on', ascending: false },
    filters: [{ name: 'kind', label: 'Ingresos y egresos', options: TX_KINDS }],
    fields: [
      { name: 'kind', label: 'Tipo', type: 'select', required: true, options: TX_KINDS },
      {
        name: 'category',
        label: 'Categoría',
        type: 'text',
        required: true,
        hint: 'Por ejemplo: ventas, publicidad, producción, logística.',
      },
      { name: 'amount', label: 'Monto (MXN)', type: 'number', required: true },
      { name: 'occurred_on', label: 'Fecha', type: 'date', required: true },
      { name: 'description', label: 'Descripción', type: 'text' },
      { name: 'account_id', label: 'Empresa relacionada', type: 'relation', relation: 'accounts' },
      {
        name: 'campaign_id',
        label: 'Campaña relacionada',
        type: 'relation',
        relation: 'campaigns',
      },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { path: 'occurred_on', label: 'Fecha', as: 'date' },
      { path: 'kind', label: 'Tipo', as: 'badge', options: TX_KINDS },
      { path: 'category', label: 'Categoría' },
      { path: 'amount', label: 'Monto', as: 'money' },
      { path: 'account.name', label: 'Empresa' },
      { path: 'description', label: 'Descripción' },
    ],
    empty: {
      title: 'Aún no hay movimientos',
      description: 'Registra ingresos y egresos para ver el balance del mes.',
    },
  },
  projects: {
    key: 'projects',
    table: 'projects',
    singular: 'proyecto',
    plural: 'Proyectos',
    isFeminine: false,
    select: '*, owner:profiles!owner_id(name)',
    search: ['name'],
    order: { column: 'created_at', ascending: false },
    filters: [{ name: 'status', label: 'Todos los estados', options: PROJECT_STATUS }],
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: PROJECT_STATUS },
      { name: 'owner_id', label: 'Responsable', type: 'relation', relation: 'profiles' },
      { name: 'starts_on', label: 'Inicio', type: 'date' },
      { name: 'due_on', label: 'Fecha límite', type: 'date' },
      { name: 'description', label: 'Descripción', type: 'textarea' },
    ],
    columns: [
      { path: 'name', label: 'Proyecto' },
      { path: 'status', label: 'Estado', as: 'badge', options: PROJECT_STATUS },
      { path: 'owner.name', label: 'Responsable' },
      { path: 'due_on', label: 'Fecha límite', as: 'date' },
    ],
    empty: {
      title: 'Aún no hay proyectos',
      description: 'Agrupa el trabajo del equipo en proyectos con responsable y fecha límite.',
    },
  },
  tasks: {
    key: 'tasks',
    table: 'tasks',
    singular: 'tarea',
    plural: 'Tareas',
    isFeminine: true,
    select: '*, project:projects!project_id(name), assignee:profiles!assignee_id(name)',
    search: ['title'],
    order: { column: 'due_on', ascending: true },
    filters: [],
    fields: [
      { name: 'title', label: 'Tarea', type: 'text', required: true },
      { name: 'project_id', label: 'Proyecto', type: 'relation', relation: 'projects' },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: TASK_STATUS },
      {
        name: 'priority',
        label: 'Prioridad',
        type: 'select',
        required: true,
        options: TASK_PRIORITY,
      },
      { name: 'assignee_id', label: 'Responsable', type: 'relation', relation: 'profiles' },
      { name: 'due_on', label: 'Fecha límite', type: 'date' },
      { name: 'description', label: 'Detalle', type: 'textarea' },
    ],
    columns: [],
    empty: { title: 'Sin tareas', description: 'Crea la primera tarea del equipo.' },
  },
  products: {
    key: 'products',
    table: 'products',
    singular: 'producto',
    plural: 'Productos',
    isFeminine: false,
    select: '*',
    search: ['name', 'category'],
    order: { column: 'name', ascending: true },
    filters: [{ name: 'status', label: 'Todos los estados', options: PRODUCT_STATUS }],
    fields: [
      { name: 'name', label: 'Nombre del producto', type: 'text', required: true },
      { name: 'category', label: 'Categoría', type: 'text' },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: PRODUCT_STATUS },
      { name: 'description', label: 'Descripción', type: 'textarea' },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { path: 'name', label: 'Producto' },
      { path: 'category', label: 'Categoría' },
      { path: 'status', label: 'Estado', as: 'badge', options: PRODUCT_STATUS },
    ],
    empty: {
      title: 'Aún no hay productos',
      description: 'Registra tus productos y después sus presentaciones (SKU) con precio y costo.',
    },
  },
  variants: {
    key: 'variants',
    table: 'product_variants',
    singular: 'presentación',
    plural: 'Presentaciones y SKU',
    isFeminine: true,
    select: '*, product:products!product_id(name)',
    search: ['sku', 'presentation'],
    order: { column: 'sku', ascending: true },
    filters: [
      {
        name: 'status',
        label: 'Todos los estados',
        options: opts(['active', 'Activa'], ['inactive', 'Inactiva']),
      },
    ],
    fields: [
      {
        name: 'product_id',
        label: 'Producto',
        type: 'relation',
        relation: 'products',
        required: true,
      },
      { name: 'sku', label: 'SKU', type: 'text', required: true },
      { name: 'presentation', label: 'Presentación', type: 'text', required: true },
      { name: 'volume_ml', label: 'Volumen (ml)', type: 'number', integer: true },
      { name: 'abv', label: 'Graduación alcohólica (% Alc. Vol.)', type: 'number', max: 100 },
      { name: 'price', label: 'Precio de lista (MXN)', type: 'number' },
      { name: 'cost', label: 'Costo (MXN)', type: 'number' },
      {
        name: 'status',
        label: 'Estado',
        type: 'select',
        required: true,
        options: opts(['active', 'Activa'], ['inactive', 'Inactiva']),
      },
      {
        name: 'verified',
        label: 'Datos verificados contra la etiqueta oficial',
        type: 'checkbox',
      },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { path: 'sku', label: 'SKU' },
      { path: 'product.name', label: 'Producto' },
      { path: 'presentation', label: 'Presentación' },
      { path: 'volume_ml', label: 'ml' },
      { path: 'price', label: 'Precio', as: 'money' },
      { path: 'verified', label: 'Verificado', as: 'bool' },
    ],
    empty: {
      title: 'Aún no hay presentaciones',
      description:
        'Cada presentación (por ejemplo, botella de 750 ml) lleva su SKU, precio y costo.',
    },
  },
  campaigns: {
    key: 'campaigns',
    table: 'campaigns',
    singular: 'campaña',
    plural: 'Campañas',
    isFeminine: true,
    select: '*, owner:profiles!owner_id(name)',
    search: ['name'],
    order: { column: 'created_at', ascending: false },
    filters: [{ name: 'status', label: 'Todos los estados', options: CAMPAIGN_STATUS }],
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: CAMPAIGN_STATUS },
      { name: 'objective', label: 'Objetivo', type: 'textarea' },
      { name: 'budget', label: 'Presupuesto (MXN)', type: 'number', blankAs: 0 },
      { name: 'spent', label: 'Gastado (MXN)', type: 'number', blankAs: 0 },
      { name: 'starts_on', label: 'Inicio', type: 'date' },
      { name: 'ends_on', label: 'Fin', type: 'date' },
      { name: 'owner_id', label: 'Responsable', type: 'relation', relation: 'profiles' },
      { name: 'results', label: 'Resultados', type: 'textarea' },
    ],
    columns: [
      { path: 'name', label: 'Campaña' },
      { path: 'status', label: 'Estado', as: 'badge', options: CAMPAIGN_STATUS },
      { path: 'budget', label: 'Presupuesto', as: 'money' },
      { path: 'spent', label: 'Gastado', as: 'money' },
      { path: 'ends_on', label: 'Fin', as: 'date' },
      { path: 'owner.name', label: 'Responsable' },
    ],
    empty: {
      title: 'Aún no hay campañas',
      description:
        'Planea campañas con objetivo, presupuesto y resultados, y liga a ellas tu contenido.',
    },
  },
  content_items: {
    key: 'content_items',
    table: 'content_items',
    singular: 'contenido',
    plural: 'Calendario editorial',
    isFeminine: false,
    select:
      '*, asset:brand_assets!asset_id(title,storage_path,mime), owner:profiles!owner_id(name)',
    search: ['title'],
    order: { column: 'scheduled_at', ascending: true },
    filters: [],
    fields: [
      { name: 'title', label: 'Título', type: 'text', required: true },
      { name: 'channel', label: 'Canal', type: 'select', required: true, options: CHANNELS },
      { name: 'format', label: 'Formato', type: 'select', required: true, options: FORMATS },
      {
        name: 'status',
        label: 'Estado inicial',
        type: 'select',
        required: true,
        lockOnEdit: true,
        options: opts(['idea', 'Idea'], ['draft', 'Borrador'], ['in_review', 'Enviar a revisión']),
      },
      { name: 'scheduled_at', label: 'Fecha y hora de publicación', type: 'datetime' },
      { name: 'asset_id', label: 'Archivo de la biblioteca', type: 'relation', relation: 'assets' },
      { name: 'campaign_id', label: 'Campaña', type: 'relation', relation: 'campaigns' },
      { name: 'owner_id', label: 'Responsable', type: 'relation', relation: 'profiles' },
      { name: 'copy', label: 'Texto de la publicación', type: 'textarea' },
      { name: 'notes', label: 'Notas internas', type: 'textarea' },
    ],
    columns: [],
    empty: { title: 'Sin contenido', description: 'Planea tu primera publicación.' },
  },
  accounts: {
    key: 'accounts',
    table: 'accounts',
    singular: 'empresa',
    plural: 'Empresas y prospectos',
    isFeminine: true,
    select: '*, owner:profiles!owner_id(name), territory:territories!territory_id(name)',
    search: ['name', 'legal_name', 'city', 'email'],
    order: { column: 'created_at', ascending: false },
    softDelete: true,
    filters: [
      { name: 'type', label: 'Todos los tipos', options: ACCOUNT_TYPES },
      { name: 'status', label: 'Todos los estados', options: ACCOUNT_STATUS },
    ],
    fields: [
      { name: 'name', label: 'Nombre comercial', type: 'text', required: true },
      { name: 'legal_name', label: 'Razón social', type: 'text' },
      { name: 'type', label: 'Tipo', type: 'select', required: true, options: ACCOUNT_TYPES },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: ACCOUNT_STATUS },
      { name: 'owner_id', label: 'Responsable', type: 'relation', relation: 'profiles' },
      { name: 'territory_id', label: 'Territorio', type: 'relation', relation: 'territories' },
      { name: 'city', label: 'Ciudad', type: 'text' },
      { name: 'state', label: 'Estado / provincia', type: 'text' },
      { name: 'country', label: 'País', type: 'text' },
      { name: 'phone', label: 'Teléfono', type: 'tel' },
      { name: 'email', label: 'Correo', type: 'email' },
      { name: 'website', label: 'Sitio web', type: 'url' },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { path: 'name', label: 'Empresa' },
      { path: 'type', label: 'Tipo', as: 'badge', options: ACCOUNT_TYPES },
      { path: 'status', label: 'Estado', as: 'badge', options: ACCOUNT_STATUS },
      { path: 'owner.name', label: 'Responsable' },
      { path: 'city', label: 'Ciudad' },
      { path: 'phone', label: 'Teléfono' },
    ],
    empty: {
      title: 'Aún no hay empresas',
      description:
        'Registra tu primer prospecto, cliente o distribuidor para empezar a dar seguimiento.',
    },
  },
  contacts: {
    key: 'contacts',
    table: 'contacts',
    singular: 'contacto',
    plural: 'Contactos',
    isFeminine: false,
    select: '*, account:accounts!account_id(name)',
    search: ['name', 'email', 'phone', 'job_title'],
    order: { column: 'created_at', ascending: false },
    filters: [],
    fields: [
      {
        name: 'account_id',
        label: 'Empresa',
        type: 'relation',
        relation: 'accounts',
        required: true,
      },
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'job_title', label: 'Puesto', type: 'text' },
      { name: 'email', label: 'Correo', type: 'email' },
      { name: 'phone', label: 'Teléfono / WhatsApp', type: 'tel' },
      { name: 'is_primary', label: 'Contacto principal de la empresa', type: 'checkbox' },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { path: 'name', label: 'Nombre' },
      { path: 'account.name', label: 'Empresa' },
      { path: 'job_title', label: 'Puesto' },
      { path: 'email', label: 'Correo' },
      { path: 'phone', label: 'Teléfono' },
      { path: 'is_primary', label: 'Principal', as: 'bool' },
    ],
    empty: {
      title: 'Aún no hay contactos',
      description: 'Agrega a las personas con las que hablas en cada empresa.',
    },
  },
  opportunities: {
    key: 'opportunities',
    table: 'opportunities',
    singular: 'oportunidad',
    plural: 'Oportunidades',
    isFeminine: true,
    select:
      '*, account:accounts!account_id(name), stage:pipeline_stages!stage_id(name,kind), owner:profiles!owner_id(name)',
    search: ['title'],
    order: { column: 'created_at', ascending: false },
    filters: [],
    fields: [
      { name: 'title', label: 'Oportunidad', type: 'text', required: true },
      {
        name: 'account_id',
        label: 'Empresa',
        type: 'relation',
        relation: 'accounts',
        required: true,
      },
      { name: 'stage_id', label: 'Etapa', type: 'relation', relation: 'stages', required: true },
      { name: 'amount', label: 'Monto estimado (MXN)', type: 'number', blankAs: 0 },
      { name: 'expected_close', label: 'Cierre esperado', type: 'date' },
      { name: 'owner_id', label: 'Responsable', type: 'relation', relation: 'profiles' },
      { name: 'lost_reason', label: 'Motivo si se pierde', type: 'text' },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { path: 'title', label: 'Oportunidad' },
      { path: 'account.name', label: 'Empresa' },
      { path: 'stage.name', label: 'Etapa', as: 'badge' },
      { path: 'amount', label: 'Monto', as: 'money' },
      { path: 'expected_close', label: 'Cierre', as: 'date' },
    ],
    empty: {
      title: 'Aún no hay oportunidades',
      description: 'Crea una oportunidad desde una empresa para verla avanzar en el pipeline.',
    },
  },
  activities: {
    key: 'activities',
    table: 'activities',
    singular: 'actividad',
    plural: 'Actividades',
    isFeminine: true,
    select: '*, account:accounts!account_id(name), owner:profiles!owner_id(name)',
    search: ['subject'],
    order: { column: 'due_at', ascending: true },
    filters: [],
    fields: [
      { name: 'kind', label: 'Tipo', type: 'select', required: true, options: ACTIVITY_KINDS },
      { name: 'subject', label: 'Asunto', type: 'text', required: true },
      { name: 'due_at', label: 'Fecha y hora', type: 'datetime' },
      { name: 'account_id', label: 'Empresa', type: 'relation', relation: 'accounts' },
      { name: 'owner_id', label: 'Responsable', type: 'relation', relation: 'profiles' },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { path: 'subject', label: 'Asunto' },
      { path: 'kind', label: 'Tipo', as: 'badge', options: ACTIVITY_KINDS },
      { path: 'account.name', label: 'Empresa' },
      { path: 'owner.name', label: 'Responsable' },
      { path: 'due_at', label: 'Fecha', as: 'datetime' },
    ],
    empty: {
      title: 'Sin actividades',
      description: 'Registra llamadas, reuniones y pendientes de seguimiento.',
    },
  },
  territories: {
    key: 'territories',
    table: 'territories',
    singular: 'territorio',
    plural: 'Territorios',
    isFeminine: false,
    select: '*',
    search: ['name'],
    order: { column: 'name', ascending: true },
    filters: [{ name: 'kind', label: 'Todos los tipos', options: TERRITORY_KINDS }],
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'kind', label: 'Tipo', type: 'select', required: true, options: TERRITORY_KINDS },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { path: 'name', label: 'Territorio' },
      { path: 'kind', label: 'Tipo', as: 'badge', options: TERRITORY_KINDS },
      { path: 'notes', label: 'Notas' },
    ],
    empty: {
      title: 'Aún no hay territorios',
      description: 'Define los países, estados o ciudades donde quieres expandir la marca.',
    },
  },
  distributors: {
    key: 'distributors',
    table: 'distributors',
    singular: 'distribuidor',
    plural: 'Distribuidores',
    isFeminine: false,
    select: '*, account:accounts!account_id(name,city), territory:territories!territory_id(name)',
    search: [],
    order: { column: 'created_at', ascending: false },
    filters: [{ name: 'status', label: 'Todos los estados', options: DISTRIBUTOR_STATUS }],
    fields: [
      {
        name: 'account_id',
        label: 'Empresa',
        type: 'relation',
        relation: 'accounts',
        required: true,
        lockOnEdit: true,
        hint: 'La empresa se marcará como distribuidor. Si no existe, créala primero en Empresas.',
      },
      {
        name: 'status',
        label: 'Estado',
        type: 'select',
        required: true,
        options: DISTRIBUTOR_STATUS,
      },
      { name: 'territory_id', label: 'Territorio', type: 'relation', relation: 'territories' },
      { name: 'exclusive', label: 'Exclusividad en el territorio', type: 'checkbox' },
      { name: 'contract_start', label: 'Inicio de contrato', type: 'date' },
      { name: 'contract_end', label: 'Fin de contrato', type: 'date' },
      { name: 'commercial_terms', label: 'Condiciones comerciales', type: 'textarea' },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { path: 'account.name', label: 'Distribuidor' },
      { path: 'status', label: 'Estado', as: 'badge', options: DISTRIBUTOR_STATUS },
      { path: 'territory.name', label: 'Territorio' },
      { path: 'exclusive', label: 'Exclusivo', as: 'bool' },
      { path: 'contract_end', label: 'Fin de contrato', as: 'date' },
    ],
    empty: {
      title: 'Aún no hay distribuidores',
      description: 'Registra a tus distribuidores con sus condiciones, territorio y contrato.',
    },
  },
};

export const isEntityKey = (k: string): k is EntityKey => k in ENTITIES;

/** Zod schema derived from the field list. Blank inputs become null; the database re-validates everything. */
export function schemaFor(def: EntityDef, mode: 'create' | 'edit' = 'create') {
  const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);
  const base = (f: Field): z.ZodType => {
    switch (f.type) {
      case 'number': {
        const n = z.coerce
          .number()
          .min(0, 'No puede ser negativo')
          .max(f.max ?? 1e12, `No puede ser mayor a ${f.max ?? 1e12}`);
        return f.integer ? n.int('Usa un número entero') : n;
      }
      case 'email':
        return z.email('Correo inválido').max(254);
      case 'url':
        return z.url('Escribe una dirección completa (https://…)').max(500);
      case 'relation':
        return z.uuid('Elige una opción');
      case 'date':
        return z.iso.date('Fecha inválida');
      case 'datetime':
        return z.string().max(40);
      default:
        return z
          .string()
          .trim()
          .max(f.type === 'textarea' ? 4000 : 300);
    }
  };
  const shape: Record<string, z.ZodType> = {};
  for (const f of def.fields) {
    if (mode === 'edit' && f.lockOnEdit) continue;
    if (f.type === 'checkbox') shape[f.name] = z.boolean().default(false);
    else if (f.type === 'select')
      shape[f.name] = z.enum((f.options ?? []).map((o) => o.value) as [string, ...string[]]);
    else if (f.type === 'number' && f.blankAs !== undefined)
      shape[f.name] = z.preprocess((v) => (blank(v) === null ? f.blankAs : v), base(f)).optional();
    else if (f.required)
      shape[f.name] = z.preprocess(
        blank,
        z.union([z.null(), base(f)]).refine((v) => v !== null, 'Obligatorio'),
      );
    else shape[f.name] = z.preprocess(blank, base(f).nullable()).optional();
  }
  return z.object(shape);
}

/** A datetime-local input has no zone: it is Mexico City wall time (UTC-6, no daylight saving since 2022). */
export function localToIso(v: string | null | undefined): string | null {
  if (!v) return null;
  const withSeconds = v.length === 16 ? `${v}:00` : v;
  const d = new Date(`${withSeconds}-06:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
  return parts.replace(' ', 'T');
}

export function getPath(row: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, row);
}
