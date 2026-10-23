-- ELODIA OS · ventas: cotizaciones, pedidos y pagos.
-- Cada línea guarda el precio, descuento e impuesto de ese momento (snapshot): cambiar la lista de precios
-- después no altera cotizaciones ni pedidos ya hechos.

-- Quien puede cobrar y ver pagos: administración del dinero y gerencia comercial.
create function public.can_collect() returns boolean language sql stable as $$
  select public.role_in('tech_superadmin','director_vp','ops_admin','finance','sales_manager')
$$;

create sequence public.quote_seq;
create sequence public.order_seq;

-- ───────── Cotizaciones ─────────
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('COT-' || lpad(nextval('public.quote_seq')::text, 5, '0')),
  account_id uuid not null references public.accounts(id) on delete restrict,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','sent','accepted','rejected')),
  valid_until date,
  currency char(3) not null default 'MXN',
  notes text,
  subtotal numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.quotes (account_id);
create index on public.quotes (status);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  description text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount_pct numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  tax_rate numeric(5,2) not null default 16 check (tax_rate between 0 and 100),
  line_total numeric(14,2) generated always as (round(quantity * unit_price * (1 - discount_pct / 100), 2)) stored,
  tax_amount numeric(14,2) generated always as (round(round(quantity * unit_price * (1 - discount_pct / 100), 2) * tax_rate / 100, 2)) stored,
  created_at timestamptz not null default now()
);
create index on public.quote_items (quote_id);

-- ───────── Pedidos ─────────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('PED-' || lpad(nextval('public.order_seq')::text, 5, '0')),
  account_id uuid not null references public.accounts(id) on delete restrict,
  quote_id uuid unique references public.quotes(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  currency char(3) not null default 'MXN',
  notes text,
  subtotal numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  paid_total numeric(14,2) not null default 0,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.orders (account_id);
create index on public.orders (status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  description text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount_pct numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  tax_rate numeric(5,2) not null default 16 check (tax_rate between 0 and 100),
  line_total numeric(14,2) generated always as (round(quantity * unit_price * (1 - discount_pct / 100), 2)) stored,
  tax_amount numeric(14,2) generated always as (round(round(quantity * unit_price * (1 - discount_pct / 100), 2) * tax_rate / 100, 2)) stored,
  created_at timestamptz not null default now()
);
create index on public.order_items (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null default current_date,
  method text not null default 'transfer' check (method in ('transfer','cash','card','check','other')),
  reference text,
  notes text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.payments (order_id);

-- ───────── Reglas ─────────
-- Totales del documento a partir de sus líneas.
create function public.quote_recalc() returns trigger language plpgsql security definer set search_path = public as $$
declare qid uuid := coalesce(new.quote_id, old.quote_id);
begin
  update public.quotes q set
    subtotal = coalesce(s.sub, 0), discount_total = coalesce(s.disc, 0), tax_total = coalesce(s.tax, 0),
    total = coalesce(s.sub, 0) - coalesce(s.disc, 0) + coalesce(s.tax, 0)
  from (select sum(round(quantity * unit_price, 2)) sub, sum(round(quantity * unit_price, 2) - line_total) disc, sum(tax_amount) tax
        from public.quote_items where quote_id = qid) s
  where q.id = qid;
  return null;
end $$;
create trigger quote_items_recalc after insert or update or delete on public.quote_items for each row execute function public.quote_recalc();

create function public.order_recalc() returns trigger language plpgsql security definer set search_path = public as $$
declare oid uuid := coalesce(new.order_id, old.order_id);
begin
  update public.orders o set
    subtotal = coalesce(s.sub, 0), discount_total = coalesce(s.disc, 0), tax_total = coalesce(s.tax, 0),
    total = coalesce(s.sub, 0) - coalesce(s.disc, 0) + coalesce(s.tax, 0)
  from (select sum(round(quantity * unit_price, 2)) sub, sum(round(quantity * unit_price, 2) - line_total) disc, sum(tax_amount) tax
        from public.order_items where order_id = oid) s
  where o.id = oid;
  return null;
end $$;
create trigger order_items_recalc after insert or update or delete on public.order_items for each row execute function public.order_recalc();

-- Una cotización aceptada o rechazada, o un pedido que ya avanzó, no cambia de líneas.
create function public.quote_items_guard() returns trigger language plpgsql as $$
declare st text; v_price numeric;
begin
  select status into st from public.quotes where id = coalesce(new.quote_id, old.quote_id);
  if st not in ('draft','sent') then
    raise exception 'la cotización ya no se puede modificar (%).', st using errcode = '23514';
  end if;
  if tg_op <> 'DELETE' then
    -- Descuentos: hasta 10 % los da cualquiera; más, solo gerencia. Precio distinto al de lista: solo gerencia.
    if new.discount_pct > 10 and not public.can_manage() then
      raise exception 'los descuentos mayores a 10 %% los autoriza la gerencia comercial' using errcode = '42501';
    end if;
    if new.variant_id is not null then
      select price into v_price from public.product_variants where id = new.variant_id;
      if v_price is not null and new.unit_price <> v_price and not public.can_manage() then
        raise exception 'el precio distinto al de lista lo autoriza la gerencia comercial' using errcode = '42501';
      end if;
    end if;
    return new;
  end if;
  return old;
end $$;
create trigger quote_items_guard before insert or update or delete on public.quote_items for each row execute function public.quote_items_guard();

create function public.order_items_guard() returns trigger language plpgsql as $$
declare st text;
begin
  select status into st from public.orders where id = coalesce(new.order_id, old.order_id);
  if st <> 'pending' then
    raise exception 'el pedido ya no se puede modificar (%).', st using errcode = '23514';
  end if;
  if tg_op <> 'DELETE' then
    if new.discount_pct > 10 and not public.can_manage() then
      raise exception 'los descuentos mayores a 10 %% los autoriza la gerencia comercial' using errcode = '42501';
    end if;
    return new;
  end if;
  return old;
end $$;
create trigger order_items_guard before insert or update or delete on public.order_items for each row execute function public.order_items_guard();

-- Transiciones de estado permitidas.
create function public.quote_status_guard() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if not ((old.status = 'draft' and new.status = 'sent')
         or (old.status = 'sent' and new.status in ('accepted','rejected','draft'))
         or (old.status = 'rejected' and new.status = 'draft')) then
      raise exception 'cambio de estado no permitido: % → %', old.status, new.status using errcode = '23514';
    end if;
    if new.status = 'sent' and new.total <= 0 then
      raise exception 'agrega al menos una línea antes de enviar la cotización' using errcode = '23514';
    end if;
  elsif old.status in ('accepted') and (new.account_id, new.valid_until) is distinct from (old.account_id, old.valid_until) then
    raise exception 'una cotización aceptada no se modifica' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger quotes_status_guard before update on public.quotes for each row execute function public.quote_status_guard();

create function public.order_status_guard() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if not ((old.status = 'pending' and new.status in ('confirmed','cancelled'))
         or (old.status = 'confirmed' and new.status in ('shipped','cancelled'))
         or (old.status = 'shipped' and new.status = 'delivered')) then
      raise exception 'cambio de estado no permitido: % → %', old.status, new.status using errcode = '23514';
    end if;
    if new.status = 'confirmed' and new.total <= 0 then
      raise exception 'agrega al menos una línea antes de confirmar el pedido' using errcode = '23514';
    end if;
    if new.status = 'cancelled' and old.paid_total > 0 then
      raise exception 'el pedido tiene pagos registrados: reembólsalos o elimínalos antes de cancelar' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger orders_status_guard before update on public.orders for each row execute function public.order_status_guard();

-- Saldos: no se cobra más que el total, ni en pedidos cancelados; el pagado se mantiene solo.
create function public.payments_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare o public.orders; already numeric;
begin
  select * into o from public.orders where id = new.order_id for update;
  if o.status in ('cancelled','pending') then
    raise exception 'solo se registran pagos de pedidos confirmados' using errcode = '23514';
  end if;
  select coalesce(sum(amount), 0) into already from public.payments where order_id = new.order_id and id is distinct from new.id;
  if already + new.amount > o.total then
    raise exception 'el pago excede el saldo pendiente (%).', to_char(o.total - already, 'FM999,999,990.00') using errcode = '23514';
  end if;
  return new;
end $$;
create trigger payments_guard before insert or update on public.payments for each row execute function public.payments_guard();

create function public.payments_sync() returns trigger language plpgsql security definer set search_path = public as $$
declare oid uuid := coalesce(new.order_id, old.order_id);
begin
  update public.orders set paid_total = (select coalesce(sum(amount), 0) from public.payments where order_id = oid) where id = oid;
  return null;
end $$;
create trigger payments_sync after insert or update or delete on public.payments for each row execute function public.payments_sync();

-- Convierte una cotización aceptada en pedido, en una sola transacción y una sola vez (orders.quote_id es único).
create function public.convert_quote_to_order(p_quote uuid) returns uuid language plpgsql as $$
declare q public.quotes; new_id uuid;
begin
  select * into q from public.quotes where id = p_quote for update;
  if not found then raise exception 'cotización no encontrada' using errcode = '23514'; end if;
  if q.status <> 'accepted' then raise exception 'solo se convierte una cotización aceptada' using errcode = '23514'; end if;
  if exists (select 1 from public.orders where quote_id = p_quote) then
    raise exception 'esta cotización ya se convirtió en pedido' using errcode = '23514';
  end if;
  insert into public.orders (account_id, quote_id, currency, notes) values (q.account_id, q.id, q.currency, q.notes) returning id into new_id;
  insert into public.order_items (order_id, variant_id, description, quantity, unit_price, discount_pct, tax_rate)
    select new_id, variant_id, description, quantity, unit_price, discount_pct, tax_rate from public.quote_items where quote_id = p_quote;
  return new_id;
end $$;

-- ───────── Auditoría, RLS ─────────
do $$ declare t text; begin
  foreach t in array array['quotes','quote_items','orders','order_items','payments'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_change()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
  foreach t in array array['quotes','orders','payments'] loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
  foreach t in array array['quotes','quote_items','orders','order_items'] loop
    execute format('create policy %I_read on public.%I for select to authenticated using (public.can_read())', t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (public.can_write())', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated using (public.can_write()) with check (public.can_write())', t, t);
  end loop;
end $$;
create policy quote_items_delete on public.quote_items for delete to authenticated using (public.can_write());
create policy order_items_delete on public.order_items for delete to authenticated using (public.can_write());
create policy quotes_delete on public.quotes for delete to authenticated using (public.can_manage() and status in ('draft','rejected'));
create policy orders_delete on public.orders for delete to authenticated using (public.can_approve() and status = 'cancelled');

create policy payments_read on public.payments for select to authenticated using (public.can_collect());
create policy payments_insert on public.payments for insert to authenticated with check (public.can_collect());
create policy payments_update on public.payments for update to authenticated using (public.can_collect()) with check (public.can_collect());
create policy payments_delete on public.payments for delete to authenticated using (public.can_collect());
