-- ELODIA OS · inventario (almacenes, lotes, movimientos), envíos y automatizaciones.
-- Las existencias salen de un libro de movimientos que solo se agrega: nunca se edita una existencia, se registra un movimiento.

create function public.can_inventory() returns boolean language sql stable as $$
  select public.role_in('tech_superadmin','director_vp','ops_admin','operations')
$$;

-- ───────── Automatizaciones (interruptores) ─────────
create table public.automation_settings (
  key text primary key,
  title text not null,
  description text not null,
  enabled boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.automation_settings (key, title, description) values
  ('reserve_on_confirm', 'Reservar inventario al confirmar un pedido',
   'Al confirmar un pedido se aparta la cantidad de cada línea en el almacén predeterminado; al enviarlo sale del inventario y si se cancela se libera. Si no hay existencias, el pedido no se confirma.'),
  ('followup_quote', 'Dar seguimiento a las cotizaciones enviadas',
   'Al marcar una cotización como enviada se crea una actividad de seguimiento para dentro de 3 días, a nombre de quien la creó.'),
  ('followup_prospect', 'Dar seguimiento a los prospectos nuevos',
   'Al registrar un prospecto se crea una actividad para contactarlo dentro de 2 días, a nombre de quien lo registró.');

alter table public.activities add column automation_key text unique;

create function public.automation_enabled(p_key text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select enabled from public.automation_settings where key = p_key), false)
$$;

-- Cada automatización deja una clave única: si algo se dispara dos veces, la actividad se crea una sola vez.
create function public.automation_quote_sent() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'sent' and old.status is distinct from 'sent' and public.automation_enabled('followup_quote') then
    insert into public.activities (kind, subject, due_at, account_id, owner_id, created_by, automation_key)
    values ('task', 'Dar seguimiento a la cotización ' || new.number, now() + interval '3 days', new.account_id, new.created_by, new.created_by, 'quote_sent:' || new.id)
    on conflict (automation_key) do nothing;
  end if;
  return null;
end $$;
create trigger quotes_automation after update on public.quotes for each row execute function public.automation_quote_sent();

create function public.automation_prospect_created() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'prospect' and public.automation_enabled('followup_prospect') then
    insert into public.activities (kind, subject, due_at, account_id, owner_id, created_by, automation_key)
    values ('call', 'Contactar al prospecto ' || new.name, now() + interval '2 days', new.id, coalesce(new.owner_id, new.created_by), new.created_by, 'prospect_new:' || new.id)
    on conflict (automation_key) do nothing;
  end if;
  return null;
end $$;
create trigger accounts_automation after insert on public.accounts for each row execute function public.automation_prospect_created();

-- ───────── Almacenes, lotes ─────────
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null default 'own' check (kind in ('own','third_party','distributor')),
  address text,
  active boolean not null default true,
  is_default boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index warehouses_one_default on public.warehouses ((true)) where is_default;

create table public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  lot_code text not null,
  produced_on date,
  expires_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, lot_code)
);

alter table public.product_variants add column min_stock numeric(12,2) check (min_stock is null or min_stock >= 0);

-- ───────── Libro de movimientos ─────────
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete set null,
  kind text not null check (kind in ('in','out','adjust','reserve','release')),
  qty numeric(12,2) not null check (qty <> 0),
  order_id uuid references public.orders(id) on delete set null,
  reason text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (kind = 'adjust' or qty > 0)
);
create index on public.inventory_movements (variant_id, warehouse_id);
create index on public.inventory_movements (order_id);
create index on public.inventory_movements (created_at desc);

-- No se edita ni se borra un movimiento (solo el mantenimiento con la llave de servicio puede limpiar).
create function public.inventory_immutable() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and coalesce(auth.role(), '') = 'service_role' then return old; end if;
  raise exception 'el libro de inventario solo se agrega: registra un movimiento de ajuste' using errcode = '42501';
end $$;
create trigger inventory_movements_immutable before update or delete on public.inventory_movements for each row execute function public.inventory_immutable();

-- Nunca existencias negativas, ni reservar o sacar lo que ya está apartado para otro pedido.
create function public.inventory_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare on_hand numeric; reserved numeric; active_wh boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.variant_id::text || new.warehouse_id::text, 0));
  select active into active_wh from public.warehouses where id = new.warehouse_id;
  if not coalesce(active_wh, false) and new.kind in ('in','adjust','reserve') then
    raise exception 'el almacén está desactivado' using errcode = '23514';
  end if;
  select coalesce(sum(case kind when 'in' then qty when 'out' then -qty when 'adjust' then qty else 0 end), 0),
         coalesce(sum(case kind when 'reserve' then qty when 'release' then -qty else 0 end), 0)
    into on_hand, reserved
    from public.inventory_movements where variant_id = new.variant_id and warehouse_id = new.warehouse_id;
  if new.kind = 'out' and on_hand - new.qty < reserved then
    raise exception 'existencias insuficientes: hay % disponibles (el resto está apartado)', greatest(on_hand - reserved, 0) using errcode = '23514';
  elsif new.kind = 'adjust' and new.qty < 0 and on_hand + new.qty < reserved then
    raise exception 'el ajuste deja menos existencias de las apartadas (disponibles: %)', greatest(on_hand - reserved, 0) using errcode = '23514';
  elsif new.kind = 'reserve' and on_hand - reserved < new.qty then
    raise exception 'existencias insuficientes: hay % disponibles', greatest(on_hand - reserved, 0) using errcode = '23514';
  elsif new.kind = 'release' and reserved < new.qty then
    raise exception 'no hay tanto apartado para liberar' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger inventory_movements_guard before insert on public.inventory_movements for each row execute function public.inventory_guard();

create view public.inventory_stock with (security_invoker = true) as
select variant_id, warehouse_id,
  sum(case kind when 'in' then qty when 'out' then -qty when 'adjust' then qty else 0 end) as on_hand,
  sum(case kind when 'reserve' then qty when 'release' then -qty else 0 end) as reserved,
  sum(case kind when 'in' then qty when 'out' then -qty when 'adjust' then qty else 0 end)
    - sum(case kind when 'reserve' then qty when 'release' then -qty else 0 end) as available
from public.inventory_movements group by variant_id, warehouse_id;

-- ───────── Envíos ─────────
alter table public.orders
  add column carrier text, add column tracking text,
  add column shipped_at timestamptz, add column delivered_at timestamptz;

create function public.orders_ship_stamps() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'shipped' then new.shipped_at := coalesce(new.shipped_at, now()); end if;
    if new.status = 'delivered' then new.delivered_at := now(); end if;
  end if;
  return new;
end $$;
create trigger orders_stamps before update on public.orders for each row execute function public.orders_ship_stamps();

-- Reserva al confirmar, salida al enviar, liberación al cancelar (solo si el interruptor está activo y hay almacén predeterminado).
create function public.orders_inventory() returns trigger language plpgsql security definer set search_path = public as $$
declare wh uuid; it record; net record;
begin
  if new.status is not distinct from old.status or not public.automation_enabled('reserve_on_confirm') then return null; end if;
  select id into wh from public.warehouses where is_default and active;
  if new.status = 'confirmed' then
    if wh is null then
      raise exception 'define un almacén predeterminado activo para reservar inventario' using errcode = '23514';
    end if;
    for it in select variant_id, sum(quantity) qty from public.order_items where order_id = new.id and variant_id is not null group by variant_id loop
      insert into public.inventory_movements (variant_id, warehouse_id, kind, qty, order_id, reason)
      values (it.variant_id, wh, 'reserve', it.qty, new.id, 'Pedido ' || new.number);
    end loop;
  elsif new.status in ('shipped','cancelled') then
    for net in
      select variant_id, warehouse_id, sum(case kind when 'reserve' then qty when 'release' then -qty else 0 end) as q
      from public.inventory_movements where order_id = new.id and kind in ('reserve','release')
      group by variant_id, warehouse_id having sum(case kind when 'reserve' then qty when 'release' then -qty else 0 end) > 0
    loop
      insert into public.inventory_movements (variant_id, warehouse_id, kind, qty, order_id, reason)
      values (net.variant_id, net.warehouse_id, 'release', net.q, new.id, 'Pedido ' || new.number);
      if new.status = 'shipped' then
        insert into public.inventory_movements (variant_id, warehouse_id, kind, qty, order_id, reason)
        values (net.variant_id, net.warehouse_id, 'out', net.q, new.id, 'Envío del pedido ' || new.number);
      end if;
    end loop;
  end if;
  return null;
end $$;
create trigger orders_inventory after update on public.orders for each row execute function public.orders_inventory();

-- ───────── Auditoría, RLS ─────────
do $$ declare t text; begin
  foreach t in array array['warehouses','inventory_lots','inventory_movements','automation_settings'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_change()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy %I_read on public.%I for select to authenticated using (public.can_read())', t, t);
  end loop;
  foreach t in array array['warehouses','inventory_lots'] loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (public.can_inventory())', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated using (public.can_inventory()) with check (public.can_inventory())', t, t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (public.can_approve())', t, t);
  end loop;
end $$;
create policy movements_insert on public.inventory_movements for insert to authenticated with check (public.can_inventory());
create policy automation_update on public.automation_settings for update to authenticated using (public.can_admin()) with check (public.can_admin());
revoke all on public.inventory_stock from anon;
