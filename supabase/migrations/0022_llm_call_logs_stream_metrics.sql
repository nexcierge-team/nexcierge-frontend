-- Streaming-turn telemetry for llm_call_logs (backend POST /chat/stream).
--
-- ttft_ms: time from request start to the first streamed content chunk of
--   that call. NULL for non-streamed calls (pills, translate, detect_language,
--   lesson_draft, legacy /chat interview). latency_ms stays the full call.
-- cached_input_tokens: Gemini's usage_metadata.cached_content_token_count, the
--   part of input_tokens served from the implicit prompt cache (a stable
--   system prompt + tool prefix). 0 when nothing was cached; NULL when the call
--   failed before usage came back. Lets us watch the cache-hit ratio.
--
-- Streaming turns also log one row PER MODEL ROUND, so prompt_type gains
-- `interview_followup` (the round after a tool call) alongside interview /
-- interview_retry / pills / detect_language / translate / lesson_draft.
--
-- Additive and idempotent. Apply BEFORE deploying the backend that writes
-- these columns; if it lands after, the backend logs a warning and falls back
-- to the old insert until restart (no rows are lost). Same file applies to the
-- local dev DB (`psql nexcierge -f ...`).

alter table public.llm_call_logs
  add column if not exists ttft_ms integer,
  add column if not exists cached_input_tokens integer;
