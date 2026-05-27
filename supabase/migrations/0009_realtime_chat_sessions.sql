-- Live-sync the sidebar conversations list. The sidebar listens to
-- INSERT / UPDATE / DELETE on chat_sessions so new chats, generated
-- titles, and status flips (ai → in_handoff → closed) appear without
-- a refresh. Supabase Realtime enforces RLS, so each buyer only sees
-- events for rows where auth.uid() = user_id (per
-- chat_sessions_select_own_or_am).
--
-- Adding a table to the publication is idempotent in effect but not
-- in syntax — wrap in a DO block so re-running the migration doesn't
-- fail with "relation already in publication".
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_sessions'
  ) then
    alter publication supabase_realtime add table public.chat_sessions;
  end if;
end $$;

-- replica identity full is required for UPDATE payloads to carry the
-- full row (we need title + status, not just the primary key).
alter table public.chat_sessions replica identity full;
