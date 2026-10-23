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
  'accounts' | 'territories' | 'profiles' | 'stages' | 'opportunities' | 'assets';

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
  /** Left out of the form when editing (identity of the row, e.g. the company of a distributor). */
  lockOnEdit?: boolean;
}

export interface Column {
  /** Dot path into the row, e.g. `owner.name`. */
  path: string;
  label: string;
  as?: 'text' | 'badge' | 'money' | 'date' | 'datetime' | 'bool';
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
  | 'content_items';

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

export const ENTITIES: Record<EntityKey, EntityDef> = {
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
      { name: 'amount', label: 'Monto estimado (MXN)', type: 'number' },
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
      case 'number':
        return z.coerce.number().min(0, 'No puede ser negativo').max(1e12);
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
    else if (f.required)
      shape[f.name] = z.preprocess(
        blank,
        z.union([z.null(), base(f)]).refine((v) => v !== null, 'Obligatorio'),
      );
    else shape[f.name] = z.preprocess(blank, base(f).nullable());
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
