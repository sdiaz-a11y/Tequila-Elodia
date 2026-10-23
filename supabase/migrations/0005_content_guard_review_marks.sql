-- Las marcas de revisión (confirmación legal, revisor, fecha, comentario, publicación) solo las escribe quien aprueba
-- o las pone la propia transición de estado. Antes, un editor podía poner legal_checked = true sin cambiar el estado
-- y la aprobación posterior pasaba sin que se confirmara.
create or replace function public.content_guard() returns trigger language plpgsql as $$
declare same_status boolean;
begin
  if tg_op = 'INSERT' then
    if new.status not in ('idea','draft','in_review') and not public.can_approve() then
      raise exception 'un contenido nuevo solo puede ser idea, borrador o enviarse a revisión' using errcode = '42501';
    end if;
    new.legal_checked := false; new.reviewed_by := null; new.reviewed_at := null; new.published_at := null;
    return new;
  end if;

  same_status := new.status is not distinct from old.status;

  if not same_status then
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
            is distinct from (old.title, old.copy, old.asset_id, old.channel, old.format)
        and not public.can_approve() then
    -- Cambiar un contenido ya aprobado lo devuelve a revisión: lo aprobado es lo que se publica.
    new.status := 'in_review'; new.legal_checked := false; new.reviewed_by := null; new.reviewed_at := null; new.published_at := null;
  end if;

  -- Quien solo edita no toca las marcas de revisión mientras el estado no cambia.
  if same_status and new.status = old.status and not public.can_approve() then
    new.legal_checked := old.legal_checked; new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
    new.published_at := old.published_at; new.review_comment := old.review_comment;
  end if;
  return new;
end $$;
