-- ELODIA OS · bloque de contenido: Brand Kit, biblioteca multimedia, calendario editorial y aprobaciones.
-- Sin IA. Las reglas de aprobación las hace cumplir la base de datos, no la pantalla.

-- ───────── Roles ─────────
-- Crear y editar contenido: marketing y quienes dirigen. Aprobar / marcar archivos como oficiales: dirección y administración.
create function public.can_content() returns boolean language sql stable as $$
  select public.role_in('tech_superadmin','director_vp','ops_admin','sales_manager','marketing')
$$;
create function public.can_approve() returns boolean language sql stable as $$
  select public.role_in('tech_superadmin','director_vp','ops_admin')
$$;

-- ───────── Brand Kit (una sola fila) ─────────
create table public.brand_kit (
  id smallint primary key default 1 check (id = 1),
  tone text not null default '',
  approved_messages text not null default '',
  restrictions text not null default '',
  palette jsonb not null default '[]'::jsonb,
  fonts jsonb not null default '[]'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Datos oficiales de la referencia de identidad visual de la marca (docs/brand-reference.json).
insert into public.brand_kit (id, tone, restrictions, palette, fonts) values (
  1,
  'Lujo premium, exclusivo, elegante, sofisticado, tradicional y ceremonial. Herencia mexicana con lujo contemporáneo.',
  E'Reemplazar el logotipo oficial.\nInventar certificaciones.\nCambiar la información oficial de la etiqueta.\nBranding genérico de tequila.\nExceso decorativo.\nAfirmaciones sin verificar.',
  '[
    {"name":"Negro obsidiana","hex":"#0B0B0D"},
    {"name":"Negro carbón","hex":"#1B1A1C"},
    {"name":"Grafito mate","hex":"#29272A"},
    {"name":"Oro metálico","hex":"#B8924F"},
    {"name":"Oro champaña","hex":"#D8B777"},
    {"name":"Oro antiguo","hex":"#98733D"},
    {"name":"Marfil cálido","hex":"#F0E4CF"},
    {"name":"Ámbar atardecer","hex":"#E9A85C"},
    {"name":"Verde agave","hex":"#53634A"}
  ]'::jsonb,
  '[
    {"name":"Serif elegante de alto contraste","usage":"Nombre de la marca, categoría y titulares (color oro champaña). La fuente exacta no está confirmada: pendiente de los archivos originales."},
    {"name":"Serif clásica en mayúsculas","usage":"Nombres de edición e información del producto."},
    {"name":"Firma manuscrita (Jorge Serratos)","usage":"Solo como imagen oficial."}
  ]'::jsonb
);

-- ───────── Biblioteca multimedia ─────────
create table public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'photo' check (kind in ('logo','photo','product','video','reference','document','other')),
  description text,
  storage_path text not null unique,
  mime text not null,
  size_bytes bigint not null check (size_bytes > 0),
  official boolean not null default false,
  tags text[] not null default '{}',
  uploaded_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.brand_assets (kind);
create index on public.brand_assets (official) where official;

-- Solo dirección/administración marca un archivo como oficial (la IA o un editor no pueden sustituir recursos de marca).
create function public.assets_guard() returns trigger language plpgsql as $$
begin
  if new.official and not public.can_approve() and (tg_op = 'INSERT' or old.official is distinct from new.official) then
    raise exception 'solo dirección o administración pueden marcar un archivo como oficial' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.official and not public.can_approve() then
    raise exception 'un archivo oficial solo lo modifica dirección o administración' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger brand_assets_guard before insert or update on public.brand_assets for each row execute function public.assets_guard();

-- ───────── Calendario editorial ─────────
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  channel text not null default 'instagram' check (channel in ('instagram','facebook','tiktok','youtube','linkedin','x','whatsapp','web','email','other')),
  format text not null default 'post' check (format in ('post','reel','story','video','article','newsletter','other')),
  status text not null default 'idea' check (status in ('idea','draft','in_review','approved','rejected','published')),
  scheduled_at timestamptz,
  copy text,
  notes text,
  asset_id uuid references public.brand_assets(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  -- Revisión humana: nada se da por aprobado ni "cumple la ley" automáticamente.
  legal_checked boolean not null default false,
  review_comment text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.content_items (scheduled_at);
create index on public.content_items (status);

create function public.content_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.status not in ('idea','draft','in_review') and not public.can_approve() then
      raise exception 'un contenido nuevo solo puede ser idea, borrador o enviarse a revisión' using errcode = '42501';
    end if;
    new.legal_checked := false; new.reviewed_by := null; new.reviewed_at := null; new.published_at := null;
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status in ('approved','rejected') then
      if not public.can_approve() then
        raise exception 'solo dirección o administración aprueban o rechazan contenido' using errcode = '42501';
      end if;
      if old.status <> 'in_review' then
        raise exception 'solo se aprueba o rechaza contenido que está en revisión' using errcode = '23514';
      end if;
      if new.status = 'approved' and not new.legal_checked then
        raise exception 'confirma la revisión de la normativa de publicidad de bebidas alcohólicas antes de aprobar' using errcode = '23514';
      end if;
      if new.status = 'rejected' and coalesce(btrim(new.review_comment), '') = '' then
        raise exception 'indica el motivo del rechazo' using errcode = '23514';
      end if;
      new.reviewed_by := auth.uid(); new.reviewed_at := now();
    elsif new.status = 'published' then
      if old.status <> 'approved' then
        raise exception 'solo se publica contenido aprobado' using errcode = '23514';
      end if;
      new.published_at := coalesce(new.published_at, now());
    else
      -- idea / borrador / en revisión: vuelve a empezar el ciclo de revisión
      new.legal_checked := false; new.reviewed_by := null; new.reviewed_at := null; new.published_at := null;
    end if;
  elsif old.status in ('approved','published')
        and (new.title, new.copy, new.asset_id, new.channel, new.format)
            is distinct from (old.title, old.copy, old.asset_id, old.channel, old.format) then
    -- Cambiar un contenido ya aprobado lo devuelve a revisión: lo aprobado es lo que se publica.
    if not public.can_approve() then
      new.status := 'in_review'; new.legal_checked := false; new.reviewed_by := null; new.reviewed_at := null; new.published_at := null;
    end if;
  end if;
  -- Las marcas de revisión nunca las escribe el cliente directamente.
  if new.status in ('approved','rejected') and new.status = old.status then
    new.legal_checked := old.legal_checked; new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
  end if;
  return new;
end $$;
create trigger content_items_guard before insert or update on public.content_items for each row execute function public.content_guard();

create trigger brand_assets_touch before update on public.brand_assets for each row execute function public.touch_updated_at();
create trigger content_items_touch before update on public.content_items for each row execute function public.touch_updated_at();
create trigger brand_kit_touch before update on public.brand_kit for each row execute function public.touch_updated_at();

do $$ declare t text; begin
  foreach t in array array['brand_kit','brand_assets','content_items'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_change()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy %I_read on public.%I for select to authenticated using (public.can_read())', t, t);
  end loop;
end $$;

-- audit_change() usa to_jsonb(...)->>'id'; brand_kit.id = 1 también funciona.
create policy brand_kit_update on public.brand_kit for update to authenticated using (public.can_content()) with check (public.can_content());

create policy brand_assets_insert on public.brand_assets for insert to authenticated with check (public.can_content());
create policy brand_assets_update on public.brand_assets for update to authenticated using (public.can_content()) with check (public.can_content());
create policy brand_assets_delete on public.brand_assets for delete to authenticated
  using (public.can_approve() or (public.can_content() and not official));

create policy content_insert on public.content_items for insert to authenticated with check (public.can_content());
create policy content_update on public.content_items for update to authenticated using (public.can_content()) with check (public.can_content());
create policy content_delete on public.content_items for delete to authenticated
  using (public.can_approve() or (public.can_content() and status in ('idea','draft')));

-- ───────── Almacenamiento (privado) ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand', 'brand', false, 52428800, array[
  'image/png','image/jpeg','image/webp','image/svg+xml','image/gif',
  'video/mp4','video/quicktime','video/webm',
  'application/pdf','font/ttf','font/otf','font/woff','font/woff2'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy brand_files_read on storage.objects for select to authenticated using (bucket_id = 'brand' and public.can_read());
create policy brand_files_insert on storage.objects for insert to authenticated with check (bucket_id = 'brand' and public.can_content());
create policy brand_files_delete on storage.objects for delete to authenticated using (
  bucket_id = 'brand' and (
    public.can_approve()
    or (public.can_content() and not exists (select 1 from public.brand_assets a where a.storage_path = name and a.official))
  )
);
