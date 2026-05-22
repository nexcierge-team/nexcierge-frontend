-- Row-level security. Buyers see/edit their own rows; AMs read all and
-- write to sessions they've claimed. AI + system messages bypass RLS by
-- using the service-role key from the server.

alter table public.users enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.rfqs enable row level security;

-- Helper to keep policies readable.
create or replace function public.is_account_manager()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'account_manager'
  );
$$;

-- ──────────────────────────────────────────────────────────────
-- users
-- ──────────────────────────────────────────────────────────────
drop policy if exists "users_select_own_or_am" on public.users;
create policy "users_select_own_or_am" on public.users
  for select using (auth.uid() = id or public.is_account_manager());

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- (Inserts handled by handle_auth_user trigger with security definer;
--  no client insert policy needed.)

-- ──────────────────────────────────────────────────────────────
-- chat_sessions
-- ──────────────────────────────────────────────────────────────
drop policy if exists "chat_sessions_select_own_or_am" on public.chat_sessions;
create policy "chat_sessions_select_own_or_am" on public.chat_sessions
  for select using (auth.uid() = user_id or public.is_account_manager());

drop policy if exists "chat_sessions_insert_own" on public.chat_sessions;
create policy "chat_sessions_insert_own" on public.chat_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "chat_sessions_update_own_or_assigned_am" on public.chat_sessions;
create policy "chat_sessions_update_own_or_assigned_am" on public.chat_sessions
  for update using (
    auth.uid() = user_id
    or (
      public.is_account_manager()
      and (assigned_am_user_id = auth.uid() or assigned_am_user_id is null)
    )
  );

-- ──────────────────────────────────────────────────────────────
-- chat_messages
-- ──────────────────────────────────────────────────────────────
drop policy if exists "chat_messages_select_session_member" on public.chat_messages;
create policy "chat_messages_select_session_member" on public.chat_messages
  for select using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.chat_session_id
        and (s.user_id = auth.uid() or public.is_account_manager())
    )
  );

drop policy if exists "chat_messages_insert_user" on public.chat_messages;
create policy "chat_messages_insert_user" on public.chat_messages
  for insert with check (
    sender_type = 'user'
    and sender_user_id = auth.uid()
    and exists (
      select 1 from public.chat_sessions s
      where s.id = chat_session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "chat_messages_insert_am" on public.chat_messages;
create policy "chat_messages_insert_am" on public.chat_messages
  for insert with check (
    sender_type = 'account_manager'
    and sender_user_id = auth.uid()
    and public.is_account_manager()
    and exists (
      select 1 from public.chat_sessions s
      where s.id = chat_session_id and s.assigned_am_user_id = auth.uid()
    )
  );

-- ai + system inserts use the service-role key (bypasses RLS).

-- ──────────────────────────────────────────────────────────────
-- rfqs
-- ──────────────────────────────────────────────────────────────
drop policy if exists "rfqs_select_own_or_am" on public.rfqs;
create policy "rfqs_select_own_or_am" on public.rfqs
  for select using (auth.uid() = user_id or public.is_account_manager());

drop policy if exists "rfqs_insert_own" on public.rfqs;
create policy "rfqs_insert_own" on public.rfqs
  for insert with check (auth.uid() = user_id);

drop policy if exists "rfqs_update_own_or_am" on public.rfqs;
create policy "rfqs_update_own_or_am" on public.rfqs
  for update using (auth.uid() = user_id or public.is_account_manager());
