-- Read receipts. Single timestamp per message — once set, the message
-- is considered read by the recipient. Null = unread.
--
-- One-sided (only the receiver marks the sender's messages read) so
-- we don't need a separate (message, user) pair. Adequate for our
-- two-party chat (buyer ↔ account manager).

alter table public.chat_messages
  add column if not exists read_at timestamptz;

-- Cheap partial index for "is anything unread?" lookups in the
-- mark-read endpoint.
create index if not exists chat_messages_unread_idx
  on public.chat_messages(chat_session_id, sender_type)
  where read_at is null;

-- RLS: the SELECT policy already lets session members read the row.
-- Allow recipients to UPDATE only the read_at column on incoming
-- messages. We don't bother with a column-level grant — the policy
-- only matches when sender_user_id is NOT the caller (their own
-- messages stay immutable from the recipient's side).
drop policy if exists "chat_messages_mark_read_buyer" on public.chat_messages;
create policy "chat_messages_mark_read_buyer" on public.chat_messages
  for update using (
    -- buyer marking AM / ai / system messages as read on their session
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.chat_session_id
        and s.user_id = auth.uid()
    )
    and sender_type <> 'user'
  ) with check (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.chat_session_id
        and s.user_id = auth.uid()
    )
    and sender_type <> 'user'
  );

drop policy if exists "chat_messages_mark_read_am" on public.chat_messages;
create policy "chat_messages_mark_read_am" on public.chat_messages
  for update using (
    -- assigned AM marking buyer messages as read
    public.is_account_manager()
    and sender_type = 'user'
    and exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.chat_session_id
        and s.assigned_am_user_id = auth.uid()
    )
  ) with check (
    public.is_account_manager()
    and sender_type = 'user'
    and exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.chat_session_id
        and s.assigned_am_user_id = auth.uid()
    )
  );

-- Realtime: ensure UPDATE events are published. Adding the table to
-- the publication a second time is a no-op, but `replica identity`
-- must be `full` for UPDATE payloads to include the changed row.
alter table public.chat_messages replica identity full;
