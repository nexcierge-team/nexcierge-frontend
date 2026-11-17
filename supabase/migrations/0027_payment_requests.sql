-- Payment requests: per-sourcing-request payment links the account manager
-- sends the buyer. One chat_session (sourcing request) can carry many
-- (deposit, balance, inspection fee, ...). The buyer sees them in the
-- Payments tab of that request and pays from the link; the AM marks a row
-- paid once funds land (no processor webhook yet, Phase 1).
--
-- payment_url is whatever the processor issued (Stripe payment link, bank
-- portal, ...). https only, enforced here AND in the AM route, because the
-- buyer UI renders it as a clickable "Pay now" link.
--
-- Writes go through POST/PATCH /api/am/sessions/[id]/payments* using the
-- AM's own scoped client, so the RLS below is the real gate: only the AM
-- assigned to the session may create or update its payment requests.
-- Buyers are read-only. Deleting the session cascades.
--
-- Realtime: added to supabase_realtime with replica identity full so the
-- buyer's open Payments tab (lib/useSessionPayments.ts) updates live when
-- the AM sends a link or marks it paid.

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  chat_session_id uuid not null references public.chat_sessions(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  label text not null check (char_length(btrim(label)) between 1 and 120),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  payment_url text not null check (payment_url ~* '^https://'),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_requests_session_idx
  on public.payment_requests(chat_session_id, created_at desc);

alter table public.payment_requests enable row level security;

-- Read: the buyer who owns the session, or any account manager (mirrors
-- chat_messages_select_session_member).
drop policy if exists "payment_requests_select_member" on public.payment_requests;
create policy "payment_requests_select_member" on public.payment_requests
for select using (
  exists (
    select 1 from public.chat_sessions s
    where s.id = payment_requests.chat_session_id
      and (s.user_id = (select auth.uid()) or (select public.is_account_manager()))
  )
);

-- Create: only the AM assigned to the session, stamped as the creator.
drop policy if exists "payment_requests_insert_assigned_am" on public.payment_requests;
create policy "payment_requests_insert_assigned_am" on public.payment_requests
for insert with check (
  (select public.is_account_manager())
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.chat_sessions s
    where s.id = chat_session_id
      and s.assigned_am_user_id = (select auth.uid())
  )
);

-- Update (status changes): only the AM assigned to the session.
drop policy if exists "payment_requests_update_assigned_am" on public.payment_requests;
create policy "payment_requests_update_assigned_am" on public.payment_requests
for update using (
  (select public.is_account_manager())
  and exists (
    select 1 from public.chat_sessions s
    where s.id = payment_requests.chat_session_id
      and s.assigned_am_user_id = (select auth.uid())
  )
) with check (
  (select public.is_account_manager())
  and exists (
    select 1 from public.chat_sessions s
    where s.id = payment_requests.chat_session_id
      and s.assigned_am_user_id = (select auth.uid())
  )
);

alter table public.payment_requests replica identity full;
alter publication supabase_realtime add table public.payment_requests;
