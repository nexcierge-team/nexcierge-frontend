-- AM lead-quality rating + machine-drafted agent lessons.
--
-- Two pieces of the agent-improvement loop:
--   1. rfqs gains a lead-quality verdict the claiming AM records after
--      reading a handed-off brief ("was the AI interview's output usable?").
--      This is the ground-truth label for interview quality — distinct from
--      rfqs.status (won/lost), which measures the DEAL outcome weeks later.
--   2. agent_lessons stores Gemini-drafted improvement lessons generated
--      from a rated transcript. An AM triggers generation from the
--      dashboard; each proposed lesson is human-reviewed (approve / edit /
--      reject) before anything acts on it. Approved lessons are the curated
--      input for future prompt changes — nothing consumes them
--      automatically yet.

-- ── rfqs: AM rating of the AI interview ─────────────────────────
alter table public.rfqs
  add column if not exists lead_quality text
    check (lead_quality in ('qualified', 'partial', 'junk')),
  -- Which parts of the brief were wrong or missing. Enum slugs, not free
  -- text: machine_type | specs | quantity | delivery | timeline | contact
  add column if not exists lead_quality_field_issues text[] not null default '{}',
  add column if not exists lead_quality_notes text not null default '',
  add column if not exists lead_rated_by uuid references public.users(id) on delete set null,
  add column if not exists lead_rated_at timestamptz;

-- ── agent_lessons ───────────────────────────────────────────────
create table if not exists public.agent_lessons (
  id uuid primary key default gen_random_uuid(),
  -- Provenance. SET NULL (not CASCADE) so an approved lesson survives its
  -- source session being deleted — the lesson is the durable artifact.
  chat_session_id uuid references public.chat_sessions(id) on delete set null,
  rfq_id uuid references public.rfqs(id) on delete set null,

  -- The generalizable instruction ("Always confirm new vs used before …").
  -- Editable by the reviewing AM before approval.
  lesson_text text not null,
  -- What went wrong in the source transcript that motivated this lesson.
  rationale text not null default '',

  status text not null default 'proposed'
    check (status in ('proposed', 'approved', 'rejected')),
  created_by uuid references public.users(id) on delete set null,  -- AM who triggered generation
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_lessons_status_idx
  on public.agent_lessons (status, created_at desc);
create index if not exists agent_lessons_session_idx
  on public.agent_lessons (chat_session_id);

create or replace function public.touch_agent_lesson_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_agent_lesson_update on public.agent_lessons;
create trigger on_agent_lesson_update
  before update on public.agent_lessons
  for each row execute function public.touch_agent_lesson_updated_at();

-- AM-only table: buyers never see lessons (they may quote their own
-- transcript). All access goes through the is_account_manager() helper
-- from 0004. Route handlers use the AM's scoped client, so RLS is the
-- real enforcement, not just the requireAccountManager() gate.
alter table public.agent_lessons enable row level security;

drop policy if exists "agent_lessons_select_am" on public.agent_lessons;
create policy "agent_lessons_select_am" on public.agent_lessons
  for select using (public.is_account_manager());

drop policy if exists "agent_lessons_insert_am" on public.agent_lessons;
create policy "agent_lessons_insert_am" on public.agent_lessons
  for insert with check (public.is_account_manager());

drop policy if exists "agent_lessons_update_am" on public.agent_lessons;
create policy "agent_lessons_update_am" on public.agent_lessons
  for update using (public.is_account_manager());
