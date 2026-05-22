-- Buyer profile / sourcing brief. One row per chat_session (unique FK).
-- Shape mirrors backend/app/chatbot.py::_empty_profile() flattened.

create table if not exists public.rfqs (
  id uuid primary key default gen_random_uuid(),
  chat_session_id uuid not null unique references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,

  -- buyer_info
  full_name text not null default '',
  company_name text not null default '',
  business_email text not null default '',
  phone_number text not null default '',
  job_role text not null default '',

  -- purchase_request
  machine_type text not null default '',
  intended_application text not null default '',
  technical_specifications jsonb not null default '{}'::jsonb,
  quantity text not null default '',
  delivery_country text not null default '',
  delivery_city_or_port text not null default '',
  purchase_timeline text not null default '',
  budget_range text not null default '',
  compliance_requirements text[] not null default '{}',
  new_or_used_preference text not null default '',

  -- service_preferences
  additional_notes text not null default '',

  -- bookkeeping
  status text not null default 'in_progress' check (status in ('in_progress','submitted','won','lost')),
  is_complete boolean generated always as (
    full_name <> '' and company_name <> '' and business_email <> ''
    and machine_type <> '' and intended_application <> '' and quantity <> ''
    and delivery_country <> '' and delivery_city_or_port <> ''
    and purchase_timeline <> ''
  ) stored,

  hubspot_contact_id text,
  hubspot_deal_id text,
  submitted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rfqs_user_idx on public.rfqs(user_id);
create index if not exists rfqs_hubspot_idx
  on public.rfqs(hubspot_deal_id) where hubspot_deal_id is not null;

create or replace function public.touch_rfq_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_rfq_update on public.rfqs;
create trigger on_rfq_update
  before update on public.rfqs
  for each row execute function public.touch_rfq_updated_at();
