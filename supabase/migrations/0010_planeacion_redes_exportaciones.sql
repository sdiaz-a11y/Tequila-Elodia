-- ELODIA OS · planeación estratégica (objetivos y avances), métricas de redes y registro de exportaciones.

-- ───────── Objetivos y avances ─────────
create table public.objectives (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  unit text not null default '',
  target numeric(16,2) not null check (target > 0),
  current_value numeric(16,2) not null default 0 check (current_value >= 0),
  status text not null default 'active' check (status in ('active','achieved','missed','cancelled')),
  starts_on date,
  ends_on date,
  owner_id uuid references public.profiles(id) on delete set null,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.objective_updates (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objectives(id) on delete cascade,
  value numeric(16,2) not null check (value >= 0),
  note text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.objective_updates (objective_id, created_at desc);

-- Registrar un avance deja el historial y actualiza el valor actual; al llegar a la meta se marca como lograda.
create function public.objective_update_apply() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.objectives
     set current_value = new.value,
         status = case when status = 'active' and new.value >= target then 'achieved'
                       when status = 'achieved' and new.value < target then 'active'
                       else status end
   where id = new.objective_id;
  return null;
end $$;
create trigger objective_updates_apply after insert on public.objective_updates for each row execute function public.objective_update_apply();

-- ───────── Métricas de publicaciones (registro manual) ─────────
alter table public.content_items
  add column post_url text,
  add column reach int check (reach is null or reach >= 0),
  add column engagement int check (engagement is null or engagement >= 0);

-- ───────── Exportaciones: quedan en la auditoría ─────────
alter table public.audit_log drop constraint audit_log_action_check;
alter table public.audit_log add constraint audit_log_action_check check (action in ('insert','update','delete','export'));

create function public.log_export(p_kind text, p_rows int, p_filters jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if public.app_role() is null then raise exception 'sin sesión' using errcode = '42501'; end if;
  insert into public.audit_log (actor, actor_email, table_name, row_id, action, new_row)
  values (auth.uid(), (select email from public.profiles where id = auth.uid()), 'export:' || left(p_kind, 40), null, 'export',
          jsonb_build_object('rows', p_rows, 'filters', coalesce(p_filters, '{}'::jsonb)));
end $$;
revoke all on function public.log_export(text, int, jsonb) from public, anon;
grant execute on function public.log_export(text, int, jsonb) to authenticated;

-- ───────── Triggers y seguridad ─────────
do $$ declare t text; begin
  foreach t in array array['objectives','objective_updates'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_change()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy %I_read on public.%I for select to authenticated using (public.can_read())', t, t);
  end loop;
end $$;
create trigger objectives_touch before update on public.objectives for each row execute function public.touch_updated_at();

-- Los objetivos los define la gerencia hacia arriba; cualquiera de operación registra avances.
create policy objectives_insert on public.objectives for insert to authenticated with check (public.can_manage());
create policy objectives_update on public.objectives for update to authenticated using (public.can_manage()) with check (public.can_manage());
create policy objectives_delete on public.objectives for delete to authenticated using (public.can_approve());
create policy objective_updates_insert on public.objective_updates for insert to authenticated with check (public.can_ops());
