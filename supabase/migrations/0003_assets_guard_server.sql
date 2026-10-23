-- Procesos del servidor (sin usuario, p. ej. la carga inicial de recursos oficiales) no pasan por la regla de roles.
create or replace function public.assets_guard() returns trigger language plpgsql as $$
begin
  if auth.uid() is null then return new; end if;
  if new.official and not public.can_approve() and (tg_op = 'INSERT' or old.official is distinct from new.official) then
    raise exception 'solo dirección o administración pueden marcar un archivo como oficial' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.official and not public.can_approve() then
    raise exception 'un archivo oficial solo lo modifica dirección o administración' using errcode = '42501';
  end if;
  return new;
end $$;
