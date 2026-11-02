-- RLS initplan optimization: evaluate auth.uid() / is_account_manager()
-- ONCE per query instead of once per row.
--
-- Postgres re-evaluates a bare function call in a policy for every row it
-- checks. Wrapping it in a scalar subquery, `(select auth.uid())`, lets the
-- planner hoist it into an InitPlan that runs once per statement. This is
-- the fix Supabase's performance advisor recommends (lint
-- "auth_rls_initplan"). It matters most for chat_messages, whose policies
-- run an EXISTS against chat_sessions per row, and for Realtime, which
-- checks RLS per subscriber per change.
--
-- SEMANTICS ARE UNCHANGED: every policy below is the latest definition of
-- an existing policy (0004, 0006, 0008_tighten, 0010, 0014, 0015),
-- re-created verbatim except that `auth.uid()` became `(select auth.uid())`
-- and `public.is_account_manager()` became
-- `(select public.is_account_manager())`. Policies dropped by later
-- migrations (chat_sessions_update_own_or_assigned_am,
-- rfqs_update_own_or_am) are not resurrected.
--
-- Verify after applying (should list the same 22 policies, now wrapped):
--   select schemaname, tablename, policyname, cmd, qual, with_check
--   from pg_policies
--   where schemaname in ('public', 'storage')
--   order by tablename, policyname;
--
-- One transaction: a failure part-way can never leave a table with a
-- policy dropped and not re-created.

begin;

-- from 0004_rls_policies.sql
drop policy if exists "users_select_own_or_am" on public.users;
create policy "users_select_own_or_am" on public.users
for select using ((select auth.uid()) = id or (select public.is_account_manager()));

-- from 0004_rls_policies.sql
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- from 0004_rls_policies.sql
drop policy if exists "chat_sessions_select_own_or_am" on public.chat_sessions;
create policy "chat_sessions_select_own_or_am" on public.chat_sessions
for select using ((select auth.uid()) = user_id or (select public.is_account_manager()));

-- from 0004_rls_policies.sql
drop policy if exists "chat_sessions_insert_own" on public.chat_sessions;
create policy "chat_sessions_insert_own" on public.chat_sessions
for insert with check ((select auth.uid()) = user_id);

-- from 0004_rls_policies.sql
drop policy if exists "chat_messages_select_session_member" on public.chat_messages;
create policy "chat_messages_select_session_member" on public.chat_messages
for select using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.chat_session_id
        and (s.user_id = (select auth.uid()) or (select public.is_account_manager()))
    )
  );

-- from 0004_rls_policies.sql
drop policy if exists "chat_messages_insert_user" on public.chat_messages;
create policy "chat_messages_insert_user" on public.chat_messages
for insert with check (
    sender_type = 'user'
    and sender_user_id = (select auth.uid())
    and exists (
      select 1 from public.chat_sessions s
      where s.id = chat_session_id and s.user_id = (select auth.uid())
    )
  );

-- from 0004_rls_policies.sql
drop policy if exists "chat_messages_insert_am" on public.chat_messages;
create policy "chat_messages_insert_am" on public.chat_messages
for insert with check (
    sender_type = 'account_manager'
    and sender_user_id = (select auth.uid())
    and (select public.is_account_manager())
    and exists (
      select 1 from public.chat_sessions s
      where s.id = chat_session_id and s.assigned_am_user_id = (select auth.uid())
    )
  );

-- from 0004_rls_policies.sql
drop policy if exists "rfqs_select_own_or_am" on public.rfqs;
create policy "rfqs_select_own_or_am" on public.rfqs
for select using ((select auth.uid()) = user_id or (select public.is_account_manager()));

-- from 0004_rls_policies.sql
drop policy if exists "rfqs_insert_own" on public.rfqs;
create policy "rfqs_insert_own" on public.rfqs
for insert with check ((select auth.uid()) = user_id);

-- from 0006_message_read_at.sql
drop policy if exists "chat_messages_mark_read_buyer" on public.chat_messages;
create policy "chat_messages_mark_read_buyer" on public.chat_messages
for update using (

    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.chat_session_id
        and s.user_id = (select auth.uid())
    )
    and sender_type <> 'user'
  ) with check (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.chat_session_id
        and s.user_id = (select auth.uid())
    )
    and sender_type <> 'user'
  );

-- from 0006_message_read_at.sql
drop policy if exists "chat_messages_mark_read_am" on public.chat_messages;
create policy "chat_messages_mark_read_am" on public.chat_messages
for update using (

    (select public.is_account_manager())
    and sender_type = 'user'
    and exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.chat_session_id
        and s.assigned_am_user_id = (select auth.uid())
    )
  ) with check (
    (select public.is_account_manager())
    and sender_type = 'user'
    and exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.chat_session_id
        and s.assigned_am_user_id = (select auth.uid())
    )
  );

-- from 0008_tighten_update_policies.sql
drop policy if exists "chat_sessions_update_own_buyer" on public.chat_sessions;
create policy "chat_sessions_update_own_buyer" on public.chat_sessions
for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- from 0008_tighten_update_policies.sql
drop policy if exists "chat_sessions_update_assigned_am" on public.chat_sessions;
create policy "chat_sessions_update_assigned_am" on public.chat_sessions
for update
  using (
    (select public.is_account_manager())
    and (assigned_am_user_id = (select auth.uid()) or assigned_am_user_id is null)
  )
  with check (
    (select public.is_account_manager())
    and assigned_am_user_id = (select auth.uid())
  );

-- from 0008_tighten_update_policies.sql
drop policy if exists "rfqs_update_own_buyer" on public.rfqs;
create policy "rfqs_update_own_buyer" on public.rfqs
for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- from 0008_tighten_update_policies.sql
drop policy if exists "rfqs_update_assigned_am" on public.rfqs;
create policy "rfqs_update_assigned_am" on public.rfqs
for update
  using (
    (select public.is_account_manager())
    and exists (
      select 1 from public.chat_sessions s
      where s.id = rfqs.chat_session_id
        and s.assigned_am_user_id = (select auth.uid())
    )
  )
  with check (
    (select public.is_account_manager())
    and exists (
      select 1 from public.chat_sessions s
      where s.id = rfqs.chat_session_id
        and s.assigned_am_user_id = (select auth.uid())
    )
  );

-- from 0010_chat_attachments.sql
drop policy if exists "chat_attach_insert_am" on storage.objects;
create policy "chat_attach_insert_am" on storage.objects
for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (select public.is_account_manager())
    and exists (
      select 1 from public.chat_sessions s
      where s.id = ((storage.foldername(name))[1])::uuid
        and s.assigned_am_user_id = (select auth.uid())
    )
  );

-- from 0010_chat_attachments.sql
drop policy if exists "chat_attach_select_member" on storage.objects;
create policy "chat_attach_select_member" on storage.objects
for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.chat_sessions s
      where s.id = ((storage.foldername(name))[1])::uuid
        and (s.user_id = (select auth.uid()) or (select public.is_account_manager()))
    )
  );

-- from 0014_lead_rating_and_agent_lessons.sql
drop policy if exists "agent_lessons_select_am" on public.agent_lessons;
create policy "agent_lessons_select_am" on public.agent_lessons
for select using ((select public.is_account_manager()));

-- from 0014_lead_rating_and_agent_lessons.sql
drop policy if exists "agent_lessons_insert_am" on public.agent_lessons;
create policy "agent_lessons_insert_am" on public.agent_lessons
for insert with check ((select public.is_account_manager()));

-- from 0014_lead_rating_and_agent_lessons.sql
drop policy if exists "agent_lessons_update_am" on public.agent_lessons;
create policy "agent_lessons_update_am" on public.agent_lessons
for update using ((select public.is_account_manager()));

-- from 0015_app_settings.sql
drop policy if exists "app_settings_select_am" on public.app_settings;
create policy "app_settings_select_am" on public.app_settings
for select using ((select public.is_account_manager()));

-- from 0015_app_settings.sql
drop policy if exists "app_settings_update_am" on public.app_settings;
create policy "app_settings_update_am" on public.app_settings
for update using ((select public.is_account_manager()))
  with check ((select public.is_account_manager()));

commit;
