-- App-wide runtime settings, editable from the AM dashboard.
--
-- Currently holds the three live Gemini model ids. Until now these were
-- Render env vars (GEMINI_MODEL / GEMINI_PILLS_MODEL / GEMINI_TRANSLATE_MODEL),
-- changeable only by an engineer with a service restart. This single row lets
-- an account manager flip the active model from the dashboard so non-engineers
-- can A/B models and compare performance in PostHog / llm_call_logs.
--
-- The backend stays stateless: the Next.js layer reads this row and passes the
-- chosen model in each backend request body (ChatRequest.model etc.). When the
-- read fails or a field is blank the backend falls back to its env default, so
-- the Render vars remain a safety net — never remove them.
--
-- SINGLETON: the `id boolean default true check (id)` guard means only one row
-- can ever exist (a second insert collides on the primary key).
--
-- IMPORTANT: seed values below must match what Render currently runs so that
-- switching to DB-driven config is a no-op until someone deliberately changes
-- a model. Verify against the live Render env before applying in production.

create table if not exists public.app_settings (
  id boolean primary key default true check (id),  -- singleton row guard
  -- GEMINI_MODEL: buyer interview turn (+ lesson drafting).
  interview_model text not null default 'gemini-2.5-flash',
  -- GEMINI_PILLS_MODEL: quick-reply suggestion pass.
  pills_model     text not null default 'gemini-2.5-flash-lite',
  -- GEMINI_TRANSLATE_MODEL: AM-side language detect + translation.
  translate_model text not null default 'gemini-2.5-flash-lite',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

-- Seed the single row. ON CONFLICT DO NOTHING keeps re-running the migration
-- idempotent without clobbering a value an AM has since changed.
insert into public.app_settings (id) values (true)
  on conflict (id) do nothing;

-- AM-only: model config is an operational control, never exposed to buyers.
-- The buyer chat path reads this row with the service-role key (bypasses RLS);
-- the dashboard reads/writes it with the AM's scoped client, so these policies
-- are the real enforcement — matching the agent_lessons pattern from 0014.
alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_am" on public.app_settings;
create policy "app_settings_select_am" on public.app_settings
  for select using (public.is_account_manager());

drop policy if exists "app_settings_update_am" on public.app_settings;
create policy "app_settings_update_am" on public.app_settings
  for update using (public.is_account_manager())
  with check (public.is_account_manager());
