-- Tighten UPDATE policies on chat_sessions and rfqs.
--
-- Background: the original policies in 0004 gated WHICH rows could be
-- updated but had no WITH CHECK on column values. An AM permitted to
-- update a claimed session could rewrite user_id and silently steal
-- the buyer's session + rfq into their own buyer account. Same shape
-- of bug on rfqs.
--
-- This migration:
--   1) Splits each over-broad UPDATE policy into a buyer policy and an
--      AM policy, each with an explicit WITH CHECK that pins the
--      post-update row to the same owner.
--   2) Adds BEFORE UPDATE triggers that reject mutation of ownership /
--      identity columns (user_id, chat_session_id, id, created_at) for
--      any non-service-role caller. The triggers are the real safety
--      net; the policies make intent legible.
--
-- The service-role client (used by transferSessionsOwnership /
-- transferRfqsOwnership in /auth/callback during anon → permanent
-- promotion, and by markRfqSubmitted in /api/request-review) continues
-- to bypass both RLS and the trigger via the current_user check.

-- ──────────────────────────────────────────────────────────────
-- chat_sessions
-- ──────────────────────────────────────────────────────────────
drop policy if exists "chat_sessions_update_own_or_assigned_am" on public.chat_sessions;

create policy "chat_sessions_update_own_buyer" on public.chat_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "chat_sessions_update_assigned_am" on public.chat_sessions
  for update
  using (
    public.is_account_manager()
    and (assigned_am_user_id = auth.uid() or assigned_am_user_id is null)
  )
  with check (
    public.is_account_manager()
    and assigned_am_user_id = auth.uid()
  );

create or replace function public.chat_sessions_forbid_immutable_change()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'service_role' then
    return new;
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'chat_sessions.user_id is immutable';
  end if;
  if new.id is distinct from old.id then
    raise exception 'chat_sessions.id is immutable';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'chat_sessions.created_at is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists chat_sessions_forbid_immutable_change on public.chat_sessions;
create trigger chat_sessions_forbid_immutable_change
  before update on public.chat_sessions
  for each row execute function public.chat_sessions_forbid_immutable_change();

-- ──────────────────────────────────────────────────────────────
-- rfqs
-- ──────────────────────────────────────────────────────────────
drop policy if exists "rfqs_update_own_or_am" on public.rfqs;

create policy "rfqs_update_own_buyer" on public.rfqs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "rfqs_update_assigned_am" on public.rfqs
  for update
  using (
    public.is_account_manager()
    and exists (
      select 1 from public.chat_sessions s
      where s.id = rfqs.chat_session_id
        and s.assigned_am_user_id = auth.uid()
    )
  )
  with check (
    public.is_account_manager()
    and exists (
      select 1 from public.chat_sessions s
      where s.id = rfqs.chat_session_id
        and s.assigned_am_user_id = auth.uid()
    )
  );

create or replace function public.rfqs_forbid_immutable_change()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'service_role' then
    return new;
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'rfqs.user_id is immutable';
  end if;
  if new.chat_session_id is distinct from old.chat_session_id then
    raise exception 'rfqs.chat_session_id is immutable';
  end if;
  if new.id is distinct from old.id then
    raise exception 'rfqs.id is immutable';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'rfqs.created_at is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists rfqs_forbid_immutable_change on public.rfqs;
create trigger rfqs_forbid_immutable_change
  before update on public.rfqs
  for each row execute function public.rfqs_forbid_immutable_change();
