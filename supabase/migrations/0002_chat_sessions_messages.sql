create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'ai' check (status in ('ai','in_handoff','closed')),
  handoff_requested_at timestamptz,
  assigned_am_user_id uuid references public.users(id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_sessions_user_idx
  on public.chat_sessions(user_id, updated_at desc);
create index if not exists chat_sessions_handoff_idx
  on public.chat_sessions(status, assigned_am_user_id)
  where status = 'in_handoff';

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_session_id uuid not null references public.chat_sessions(id) on delete cascade,
  sender_type text not null check (sender_type in ('user','ai','account_manager','system')),
  sender_user_id uuid references public.users(id),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_idx
  on public.chat_messages(chat_session_id, created_at);

-- Bump chat_sessions.updated_at on every new message + auto-title from the
-- buyer's first message (used by the sidebar). Trim to 60 chars.
create or replace function public.handle_new_chat_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  current_title text;
begin
  update public.chat_sessions
  set updated_at = now()
  where id = new.chat_session_id;

  if new.sender_type = 'user' then
    select title into current_title from public.chat_sessions where id = new.chat_session_id;
    if current_title is null or current_title = '' then
      update public.chat_sessions
      set title = trim(both ' ' from substring(new.content from 1 for 60))
      where id = new.chat_session_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_new_chat_message on public.chat_messages;
create trigger on_new_chat_message
  after insert on public.chat_messages
  for each row execute function public.handle_new_chat_message();

-- Realtime: include the table in the supabase_realtime publication so
-- inserts get broadcast to subscribed clients. (Buyers subscribe to
-- their chat_session_id; AMs subscribe to claimed sessions.)
alter publication supabase_realtime add table public.chat_messages;
