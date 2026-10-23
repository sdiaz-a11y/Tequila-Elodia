-- ELODIA OS · operación: proyectos y tareas, productos y presentaciones (SKU), campañas.

-- Quien puede mover la operación diaria: todo el equipo interno menos lectura pura de finanzas/colaboración.
create function public.can_ops() returns boolean language sql stable as $$
  select public.role_in('tech_superadmin','director_vp','ops_admin','sales_manager','marketing','operations')
$$;
-- Tareas: cualquier persona del equipo interno trabaja las suyas.
create function public.can_work() returns boolean language sql stable as $$
  select public.can_read()
$$;

-- ───────── Proyectos y tareas ─────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active','paused','done','cancelled')),
  owner_id uuid references public.profiles(id) on delete set null,
  starts_on date, due_on date,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_on is null or starts_on is null or due_on >= starts_on)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','doing','blocked','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  assignee_id uuid references public.profiles(id) on delete set null,
  due_on date,
  done_at timestamptz,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tasks (status);
create index on public.tasks (assignee_id);
create index on public.tasks (project_id);

create function public.tasks_done_stamp() returns trigger language plpgsql as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then new.done_at := now();
  elsif new.status <> 'done' then new.done_at := null;
  end if;
  return new;
end $$;
create trigger tasks_done before insert or update on public.tasks for each row execute function public.tasks_done_stamp();

-- ───────── Productos y presentaciones ─────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  status text not null default 'draft' check (status in ('draft','active','inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Los datos regulados (graduación, volumen) los captura el equipo y los verifica contra la etiqueta oficial.
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  presentation text not null,
  volume_ml int check (volume_ml is null or volume_ml > 0),
  abv numeric(4,1) check (abv is null or (abv > 0 and abv <= 100)),
  price numeric(14,2) check (price is null or price >= 0),
  cost numeric(14,2) check (cost is null or cost >= 0),
  status text not null default 'active' check (status in ('active','inactive')),
  verified boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.product_variants (product_id);

-- ───────── Campañas ─────────
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  objective text,
  status text not null default 'planned' check (status in ('planned','active','paused','done')),
  budget numeric(14,2) not null default 0 check (budget >= 0),
  spent numeric(14,2) not null default 0 check (spent >= 0),
  starts_on date, ends_on date,
  owner_id uuid references public.profiles(id) on delete set null,
  results text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
alter table public.content_items add column campaign_id uuid references public.campaigns(id) on delete set null;
create index on public.content_items (campaign_id);

-- ───────── Triggers y seguridad ─────────
do $$ declare t text; begin
  foreach t in array array['projects','tasks','products','product_variants','campaigns'] loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_change()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy %I_read on public.%I for select to authenticated using (public.can_read())', t, t);
  end loop;
end $$;

create policy projects_insert on public.projects for insert to authenticated with check (public.can_ops());
create policy projects_update on public.projects for update to authenticated using (public.can_ops()) with check (public.can_ops());
create policy projects_delete on public.projects for delete to authenticated using (public.can_manage());

create policy tasks_insert on public.tasks for insert to authenticated with check (public.can_work());
create policy tasks_update on public.tasks for update to authenticated using (public.can_work()) with check (public.can_work());
create policy tasks_delete on public.tasks for delete to authenticated using (public.can_manage() or created_by = auth.uid());

do $$ declare t text; begin
  foreach t in array array['products','product_variants'] loop
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (public.can_ops())', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated using (public.can_ops()) with check (public.can_ops())', t, t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (public.can_manage())', t, t);
  end loop;
end $$;

create policy campaigns_insert on public.campaigns for insert to authenticated with check (public.can_content());
create policy campaigns_update on public.campaigns for update to authenticated using (public.can_content()) with check (public.can_content());
create policy campaigns_delete on public.campaigns for delete to authenticated using (public.can_approve());
