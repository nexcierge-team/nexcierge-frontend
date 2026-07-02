-- LLM call telemetry — one row per Gemini API call, written directly by the
-- FastAPI backend over a Postgres connection (NOT via PostgREST). Source of
-- truth for cost auditing, latency debugging, and per-model reporting;
-- PostHog only gets a slim `llm_call_completed` event for dashboards.
--
-- No FK to chat_sessions/users on purpose: logs must survive session
-- deletion, and translate/detect calls have no session context. The same
-- file is applied to the local dev DB (`psql nexcierge -f ...`), which has
-- no chat tables at all.

create table if not exists public.llm_call_logs (
  id bigint generated always as identity primary key,
  conversation_id uuid,          -- chat_sessions.id when known
  user_id uuid,                  -- auth.users.id when known
  provider text not null default 'gemini',
  model text not null,
  prompt_type text not null,     -- interview | interview_retry | pills | detect_language | translate
  input_tokens integer,
  output_tokens integer,         -- visible output only
  thinking_tokens integer,       -- billed at the output rate on thinking models
  total_tokens integer,
  input_cost_usd numeric(14, 10),
  output_cost_usd numeric(14, 10),  -- includes thinking tokens
  total_cost_usd numeric(14, 10),
  latency_ms integer not null,
  success boolean not null,
  error_code text,               -- HTTP status / exception class on failure
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists llm_call_logs_model_created_idx
  on public.llm_call_logs (model, created_at);
create index if not exists llm_call_logs_conversation_idx
  on public.llm_call_logs (conversation_id);
create index if not exists llm_call_logs_created_idx
  on public.llm_call_logs (created_at);

-- Service-only table: RLS on with no policies means the anon/authenticated
-- PostgREST roles can't touch it. The backend's direct connection (postgres
-- role) bypasses RLS.
alter table public.llm_call_logs enable row level security;
