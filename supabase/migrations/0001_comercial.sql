-- ELODIA OS · bloque comercial: equipo, empresas, contactos, pipeline, actividades, territorios, distribuidores, auditoría.
-- Seguridad: RLS activado en todo; el acceso lo deciden las funciones de rol de abajo (el navegador usa la clave pública).

create extension if not exists pgcrypto;

-- ───────── Equipo ─────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'external_distributor' check (role in (
    'tech_superadmin','director_vp','ops_admin','sales_manager','salesperson',
    'marketing','operations','finance','collaborator','external_distributor')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rol de quien hace la petición (null si no hay sesión o está desactivado).
create function public.app_role() returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;
create function public.role_in(variadic roles text[]) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = any(roles), false)
$$;
-- lectura: todo el equipo interno; escritura: comercial; borrado: gerencia; administración: dirección.
create function public.can_read() returns boolean language sql stable as $$
  select public.role_in('tech_superadmin','director_vp','ops_admin','sales_manager','salesperson','marketing','operations','finance','collaborator')
$$;
create function public.can_write() returns boolean language sql stable as $$
  select public.role_in('tech_superadmin','director_vp','ops_admin','sales_manager','salesperson')
$$;
create function public.can_manage() returns boolean language sql stable as $$
  select public.role_in('tech_superadmin','director_vp','ops_admin','sales_manager')
$$;
create function public.can_admin() returns boolean language sql stable as $$
  select public.role_in('tech_superadmin','director_vp','ops_admin')
$$;

-- Al crear un usuario de Auth se crea su perfil. El rol sale de app_metadata (solo el servidor puede escribirlo).
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, coalesce(new.email,''), coalesce(new.raw_user_meta_data->>'name',''),
          coalesce(new.raw_app_meta_data->>'role','external_distributor'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- ───────── Comercial ─────────
create table public.territories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null default 'city' check (kind in ('country','state','city','region')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  type text not null default 'prospect' check (type in ('prospect','client','distributor','partner','supplier')),
  status text not null default 'active' check (status in ('active','inactive')),
  owner_id uuid references public.profiles(id) on delete set null,
  territory_id uuid references public.territories(id) on delete set null,
  city text, state text, country text default 'México',
  phone text, email text, website text, notes text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.accounts (type, status) where deleted_at is null;
create index on public.accounts (owner_id);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  job_title text,
  email text, phone text,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.contacts (account_id);

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  position int not null,
  probability int not null default 0 check (probability between 0 and 100),
  kind text not null default 'open' check (kind in ('open','won','lost')),
  created_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null,
  stage_id uuid not null references public.pipeline_stages(id) on delete restrict,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  currency char(3) not null default 'MXN',
  expected_close date,
  owner_id uuid references public.profiles(id) on delete set null,
  lost_reason text, notes text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.opportunities (stage_id);
create index on public.opportunities (account_id);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'call' check (kind in ('call','meeting','email','note','task')),
  subject text not null,
  notes text,
  due_at timestamptz,
  done_at timestamptz,
  account_id uuid references public.accounts(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.activities (due_at) where done_at is null;
create index on public.activities (account_id);

-- Un distribuidor es una empresa (accounts) con condiciones comerciales: no se duplica la empresa.
create table public.distributors (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.accounts(id) on delete cascade,
  status text not null default 'prospecting' check (status in ('prospecting','negotiating','active','paused','terminated')),
  territory_id uuid references public.territories(id) on delete set null,
  exclusive boolean not null default false,
  commercial_terms text,
  contract_start date, contract_end date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['territories','accounts','contacts','opportunities','activities','distributors'] loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ───────── Auditoría (solo se agrega) ─────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_email text,
  table_name text not null,
  row_id text,
  action text not null check (action in ('insert','update','delete')),
  old_row jsonb,
  new_row jsonb
);
create index on public.audit_log (at desc);
create index on public.audit_log (table_name, row_id);

create function public.audit_change() returns trigger language plpgsql security definer set search_path = public as $$
declare rid text;
begin
  rid := to_jsonb(coalesce(new, old))->>'id';
  insert into public.audit_log (actor, actor_email, table_name, row_id, action, old_row, new_row)
  values (auth.uid(), (select email from public.profiles where id = auth.uid()), tg_table_name, rid, lower(tg_op),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
create function public.audit_block_changes() returns trigger language plpgsql as $$
begin raise exception 'audit_log is append-only'; end $$;
create trigger audit_log_immutable before update or delete on public.audit_log for each row execute function public.audit_block_changes();

do $$ declare t text; begin
  foreach t in array array['profiles','territories','accounts','contacts','pipeline_stages','opportunities','activities','distributors'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_change()', t, t);
  end loop;
end $$;

-- ───────── Seguridad por fila ─────────
do $$ declare t text; begin
  foreach t in array array['profiles','territories','accounts','contacts','pipeline_stages','opportunities','activities','distributors','audit_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- profiles: el equipo ve a todos (para asignar responsables); solo administración edita.
create policy profiles_read on public.profiles for select to authenticated using (public.can_read());
create policy profiles_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_admin_update on public.profiles for update to authenticated using (public.can_admin()) with check (public.can_admin());

-- Tablas comerciales: leer = equipo interno · crear/editar = comercial · borrar = gerencia hacia arriba.
do $$ declare t text; begin
  foreach t in array array['territories','accounts','contacts','opportunities','activities','distributors'] loop
    execute format('create policy %I_read on public.%I for select to authenticated using (public.can_read())', t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (public.can_write())', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated using (public.can_write()) with check (public.can_write())', t, t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (public.can_manage())', t, t);
  end loop;
end $$;

-- Etapas del pipeline: todos leen, solo dirección/administración configuran.
create policy stages_read on public.pipeline_stages for select to authenticated using (public.can_read());
create policy stages_write on public.pipeline_stages for all to authenticated using (public.can_admin()) with check (public.can_admin());

-- Bitácora: solo administración la lee; nadie escribe directo (lo hacen los triggers).
create policy audit_read on public.audit_log for select to authenticated using (public.can_admin());

-- Etapas iniciales (editables): una propuesta estándar de ventas B2B.
insert into public.pipeline_stages (name, position, probability, kind) values
  ('Nuevo', 1, 10, 'open'), ('Contactado', 2, 20, 'open'), ('Reunión', 3, 40, 'open'),
  ('Propuesta', 4, 60, 'open'), ('Negociación', 5, 80, 'open'),
  ('Ganado', 6, 100, 'won'), ('Perdido', 7, 0, 'lost');
