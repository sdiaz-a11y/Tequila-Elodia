-- ELODIA OS · enlace privado para suscribir el calendario (Google Calendar, iPhone). Solo lectura.
-- Cada persona tiene un enlace secreto propio; regenerarlo invalida el anterior.
create table public.calendar_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  token text not null unique check (length(token) >= 32),
  created_at timestamptz not null default now()
);
alter table public.calendar_tokens enable row level security;
revoke all on public.calendar_tokens from anon;
create policy calendar_tokens_own_read on public.calendar_tokens for select to authenticated using (user_id = auth.uid());
create policy calendar_tokens_own_insert on public.calendar_tokens for insert to authenticated with check (user_id = auth.uid());
create policy calendar_tokens_own_update on public.calendar_tokens for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy calendar_tokens_own_delete on public.calendar_tokens for delete to authenticated using (user_id = auth.uid());
