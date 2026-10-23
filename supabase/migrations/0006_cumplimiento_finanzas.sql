-- ELODIA OS · documentación y cumplimiento (con aprobación humana y vencimientos) y finanzas.

create function public.can_finance() returns boolean language sql stable as $$
  select public.role_in('tech_superadmin','director_vp','ops_admin','finance')
$$;
create function public.can_compliance() returns boolean language sql stable as $$
  select public.role_in('tech_superadmin','director_vp','ops_admin','operations')
$$;

-- ───────── Documentos de cumplimiento ─────────
-- La plataforma no declara que algo "cumple": solo guarda el documento, su vigencia y la aprobación de una persona.
create table public.compliance_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'other' check (category in ('brand','product','contract','permit','certificate','other')),
  status text not null default 'draft' check (status in ('draft','in_review','approved')),
  expires_on date,
  product_id uuid references public.products(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  asset_id uuid references public.brand_assets(id) on delete set null,
  notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.compliance_documents (expires_on) where expires_on is not null;
create index on public.compliance_documents (status);

create function public.compliance_guard() returns trigger language plpgsql as $$
declare same_status boolean;
begin
  if tg_op = 'INSERT' then
    if new.status = 'approved' and not public.can_approve() then
      raise exception 'solo dirección o administración aprueban documentos' using errcode = '42501';
    end if;
    if new.status <> 'approved' then new.reviewed_by := null; new.reviewed_at := null; end if;
    return new;
  end if;
  same_status := new.status is not distinct from old.status;
  if not same_status then
    if new.status = 'approved' then
      if not public.can_approve() then
        raise exception 'solo dirección o administración aprueban documentos' using errcode = '42501';
      end if;
      if old.status <> 'in_review' then
        raise exception 'solo se aprueba un documento que está en revisión' using errcode = '23514';
      end if;
      new.reviewed_by := auth.uid(); new.reviewed_at := now();
    else
      new.reviewed_by := null; new.reviewed_at := null;
    end if;
  elsif old.status = 'approved'
        and (new.title, new.category, new.asset_id, new.expires_on, new.product_id, new.account_id)
            is distinct from (old.title, old.category, old.asset_id, old.expires_on, old.product_id, old.account_id)
        and not public.can_approve() then
    -- Un documento aprobado que cambia vuelve a revisión.
    new.status := 'in_review'; new.reviewed_by := null; new.reviewed_at := null;
  end if;
  if same_status and new.status = old.status and not public.can_approve() then
    new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
  end if;
  return new;
end $$;
create trigger compliance_documents_guard before insert or update on public.compliance_documents
  for each row execute function public.compliance_guard();

-- ───────── Finanzas ─────────
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('income','expense')),
  category text not null,
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null default 'MXN',
  occurred_on date not null default current_date,
  description text,
  account_id uuid references public.accounts(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  notes text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.transactions (occurred_on desc);
create index on public.transactions (kind);

-- ───────── Triggers y seguridad ─────────
do $$ declare t text; begin
  foreach t in array array['compliance_documents','transactions'] loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_change()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

create policy documents_read on public.compliance_documents for select to authenticated using (public.can_read());
create policy documents_insert on public.compliance_documents for insert to authenticated with check (public.can_compliance());
create policy documents_update on public.compliance_documents for update to authenticated using (public.can_compliance()) with check (public.can_compliance());
create policy documents_delete on public.compliance_documents for delete to authenticated using (public.can_approve());

-- El dinero solo lo ve y lo mueve quien lo administra.
create policy transactions_read on public.transactions for select to authenticated using (public.can_finance());
create policy transactions_insert on public.transactions for insert to authenticated with check (public.can_finance());
create policy transactions_update on public.transactions for update to authenticated using (public.can_finance()) with check (public.can_finance());
create policy transactions_delete on public.transactions for delete to authenticated using (public.can_finance());
