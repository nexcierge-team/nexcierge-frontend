-- chat_messages.sender_user_id: repair rows orphaned by sign-in, and stop
-- the column from blocking user deletion.
--
-- Bug: signing in creates a NEW permanent user id, and /auth/callback
-- moved only chat_sessions + rfqs from the anonymous id to it. The
-- buyer's pre-sign-in messages kept sender_user_id = <anonymous id>, and
-- that FK (0002) had no ON DELETE rule. So the optional 30-day cleanup
-- (0005: one `delete from auth.users where is_anonymous ...` statement)
-- failed as soon as ANY such anonymous user was due, which meant no
-- anonymous user got cleaned up at all. Deleting an AM account would have
-- failed the same way (their replies reference them).
--
-- Fix (the code half lives in app/auth/callback/route.ts, which now also
-- re-points message senders at sign-in):
--   1. Backfill. A buyer ('user') message can only ever be written by the
--      session owner (RLS policy chat_messages_insert_user), so the
--      correct sender is the session's current owner. Exact, not a guess.
--   2. Re-create the FK with ON DELETE SET NULL, like every other optional
--      user reference (assigned_am_user_id, lead_rated_by, created_by,
--      reviewed_by, updated_by). A deleted sender leaves the message in
--      place with an unknown sender instead of blocking the delete.
--
-- Idempotent and transactional.

begin;

update public.chat_messages m
set sender_user_id = s.user_id
from public.chat_sessions s
where m.chat_session_id = s.id
  and m.sender_type = 'user'
  and m.sender_user_id is distinct from s.user_id;

do $$
declare
  fk_name text;
begin
  -- Look the constraint up rather than assuming its generated name.
  select c.conname into fk_name
  from pg_constraint c
  join pg_attribute a
    on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.conrelid = 'public.chat_messages'::regclass
    and c.contype = 'f'
    and a.attname = 'sender_user_id'
  limit 1;
  if fk_name is not null then
    execute format('alter table public.chat_messages drop constraint %I', fk_name);
  end if;
end
$$;

alter table public.chat_messages
  add constraint chat_messages_sender_user_id_fkey
  foreign key (sender_user_id) references public.users(id) on delete set null;

commit;

-- Verify (expect 0 rows, and confdeltype = 'n' for SET NULL):
--   select count(*) from public.chat_messages m join public.chat_sessions s on s.id = m.chat_session_id
--   where m.sender_type = 'user' and m.sender_user_id is distinct from s.user_id;
--   select conname, confdeltype from pg_constraint
--   where conrelid = 'public.chat_messages'::regclass and contype = 'f';
