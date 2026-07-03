-- Add the pills-thinking level to the live model config (0015 app_settings).
--
-- The quick-reply pills pass runs a second Gemini call on every buyer turn, so
-- its thinking budget is a real cost/latency knob. This exposes it from the AM
-- dashboard as a semantic level (off | low | medium | high), which the backend
-- maps per model family (numeric budget for Gemini 2.5, level enum for Gemini
-- 3). Default 'low' reproduces the prior behaviour, so this is a no-op on apply.

alter table public.app_settings
  add column if not exists pills_thinking text not null default 'low'
    check (pills_thinking in ('off', 'low', 'medium', 'high'));
