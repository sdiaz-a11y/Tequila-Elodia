-- ELODIA OS · permisos por rol editables. Las funciones can_*() dejan de tener la lista de roles escrita y
-- consultan esta tabla; la base sigue siendo la que decide, la pantalla solo cambia las casillas.
create table public.role_capabilities (
  role text not null,
  capability text not null check (capability in ('read','write','manage','admin','content','approve','ops','collect','finance','compliance','inventory')),
  id text generated always as (role || ':' || capability) stored,
  primary key (role, capability)
);

insert into public.role_capabilities (role, capability)
select r, c from (values
  ('read',       array['tech_superadmin','director_vp','ops_admin','sales_manager','salesperson','marketing','operations','finance','collaborator']),
  ('write',      array['tech_superadmin','director_vp','ops_admin','sales_manager','salesperson']),
  ('manage',     array['tech_superadmin','director_vp','ops_admin','sales_manager']),
  ('admin',      array['tech_superadmin','director_vp','ops_admin']),
  ('content',    array['tech_superadmin','director_vp','ops_admin','sales_manager','marketing']),
  ('approve',    array['tech_superadmin','director_vp','ops_admin']),
  ('ops',        array['tech_superadmin','director_vp','ops_admin','sales_manager','marketing','operations']),
  ('collect',    array['tech_superadmin','director_vp','ops_admin','finance','sales_manager']),
  ('finance',    array['tech_superadmin','director_vp','ops_admin','finance']),
  ('compliance', array['tech_superadmin','director_vp','ops_admin','operations']),
  ('inventory',  array['tech_superadmin','director_vp','ops_admin','operations'])
) as m(c, roles), unnest(m.roles) as r;

-- El superadministrador siempre puede todo (nadie queda fuera por un error de configuración).
create function public.has_cap(p_cap text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    public.app_role() = 'tech_superadmin'
    or exists (select 1 from public.role_capabilities where role = public.app_role() and capability = p_cap),
    false)
$$;

create or replace function public.can_read() returns boolean language sql stable as $$ select public.has_cap('read') $$;
create or replace function public.can_write() returns boolean language sql stable as $$ select public.has_cap('write') $$;
create or replace function public.can_manage() returns boolean language sql stable as $$ select public.has_cap('manage') $$;
create or replace function public.can_admin() returns boolean language sql stable as $$ select public.has_cap('admin') $$;
create or replace function public.can_content() returns boolean language sql stable as $$ select public.has_cap('content') $$;
create or replace function public.can_approve() returns boolean language sql stable as $$ select public.has_cap('approve') $$;
create or replace function public.can_ops() returns boolean language sql stable as $$ select public.has_cap('ops') $$;
create or replace function public.can_collect() returns boolean language sql stable as $$ select public.has_cap('collect') $$;
create or replace function public.can_finance() returns boolean language sql stable as $$ select public.has_cap('finance') $$;
create or replace function public.can_compliance() returns boolean language sql stable as $$ select public.has_cap('compliance') $$;
create or replace function public.can_inventory() returns boolean language sql stable as $$ select public.has_cap('inventory') $$;

-- Solo el superadministrador y el director cambian permisos, y solo de los roles intermedios.
create function public.set_role_capability(p_role text, p_cap text, p_enabled boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if public.app_role() not in ('tech_superadmin','director_vp') then
    raise exception 'sin permiso para cambiar permisos' using errcode = '42501';
  end if;
  if p_role not in ('ops_admin','sales_manager','salesperson','marketing','operations','finance','collaborator') then
    raise exception 'este rol no se puede editar' using errcode = '42501';
  end if;
  if p_enabled then
    insert into public.role_capabilities (role, capability) values (p_role, p_cap) on conflict do nothing;
  else
    delete from public.role_capabilities where role = p_role and capability = p_cap;
  end if;
end $$;
revoke all on function public.set_role_capability(text, text, boolean) from public, anon;
grant execute on function public.set_role_capability(text, text, boolean) to authenticated;

create trigger role_capabilities_audit after insert or update or delete on public.role_capabilities for each row execute function public.audit_change();
alter table public.role_capabilities enable row level security;
revoke all on public.role_capabilities from anon;
revoke insert, update, delete on public.role_capabilities from authenticated;
create policy role_capabilities_read on public.role_capabilities for select to authenticated using (true);
