-- ELODIA OS · editar movimientos de inventario con historial (timeline).
-- El libro sigue siendo de solo agregar: "editar" un movimiento registra una corrección (un ajuste ligado al
-- original) con quién, cuándo, de cuánto a cuánto y por qué. Las existencias siguen saliendo de la suma.
-- Migración aditiva: no cambia ni borra ningún movimiento existente.
alter table public.inventory_movements
  add column corrects_id uuid references public.inventory_movements(id) on delete restrict;
alter table public.inventory_movements
  add constraint inventory_movements_correction_kind check (corrects_id is null or kind = 'adjust');
create index on public.inventory_movements (corrects_id) where corrects_id is not null;

-- Una corrección solo apunta a una entrada, salida o ajuste original (no a otra corrección ni a un
-- apartado de pedido) del mismo producto y almacén.
create function public.inventory_correction_guard() returns trigger language plpgsql as $$
declare o record;
begin
  if new.corrects_id is null then return new; end if;
  select kind, variant_id, warehouse_id, corrects_id, order_id into o
    from public.inventory_movements where id = new.corrects_id;
  if not found then raise exception 'el movimiento a corregir no existe' using errcode = '23503'; end if;
  if o.corrects_id is not null then raise exception 'corrige el movimiento original, no una corrección' using errcode = '23514'; end if;
  if o.kind not in ('in','out','adjust') or o.order_id is not null then
    raise exception 'los apartados y movimientos de pedidos no se editan' using errcode = '23514';
  end if;
  if o.variant_id <> new.variant_id or o.warehouse_id <> new.warehouse_id then
    raise exception 'la corrección debe ser del mismo producto y almacén' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger inventory_movements_correction before insert on public.inventory_movements
  for each row execute function public.inventory_correction_guard();

-- Edita un movimiento: calcula la diferencia contra el valor vigente y la registra como corrección.
-- Corre con los permisos de quien llama (RLS: solo quien maneja inventario puede insertar).
create function public.correct_inventory_movement(p_id uuid, p_new_qty numeric, p_reason text)
returns uuid language plpgsql set search_path = public as $$
declare o record; current_effect numeric; target_effect numeric; delta numeric; new_id uuid;
begin
  if coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'explica el motivo de la corrección' using errcode = '23514';
  end if;
  select * into o from public.inventory_movements where id = p_id;
  if not found then raise exception 'el movimiento no existe' using errcode = '23503'; end if;
  if o.kind = 'adjust' then
    if p_new_qty = 0 then raise exception 'un ajuste no puede quedar en 0' using errcode = '23514'; end if;
  elsif p_new_qty <= 0 then
    raise exception 'la cantidad debe ser mayor a 0' using errcode = '23514';
  end if;
  -- efecto en existencias: entrada suma, salida resta, ajuste con su signo
  current_effect := case o.kind when 'in' then o.qty when 'out' then -o.qty else o.qty end
    + coalesce((select sum(qty) from public.inventory_movements where corrects_id = p_id), 0);
  target_effect := case o.kind when 'in' then p_new_qty when 'out' then -p_new_qty else p_new_qty end;
  delta := target_effect - current_effect;
  if delta = 0 then raise exception 'la cantidad es la misma que ya tiene' using errcode = '23514'; end if;
  insert into public.inventory_movements (variant_id, warehouse_id, lot_id, kind, qty, reason, corrects_id)
  values (o.variant_id, o.warehouse_id, o.lot_id, 'adjust', delta, trim(p_reason), p_id)
  returning id into new_id;
  return new_id;
end $$;
revoke all on function public.correct_inventory_movement(uuid, numeric, text) from public, anon;
grant execute on function public.correct_inventory_movement(uuid, numeric, text) to authenticated;
