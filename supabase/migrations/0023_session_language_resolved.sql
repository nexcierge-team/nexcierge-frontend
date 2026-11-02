-- Detect the buyer's language once per session, not on every AM send.
--
-- chat_sessions.language sits on its 'en' default until something pins a
-- non-English value. The AM-send route (app/api/am/sessions/[id]/messages)
-- used to treat 'en' as "unknown" and re-run a Gemini /detect-language
-- call (plus a full transcript read) on EVERY send to an 'en' session,
-- because a genuinely English buyer is indistinguishable from "not
-- detected yet". This column records that the language question has been
-- answered, whatever the answer:
--
--   - POST /api/chat stamps it when the buyer's brief first completes,
--     reusing the pills pass's reply_language (no extra Gemini call).
--     Handoff requires a complete brief, so every newly handed-off
--     session arrives already resolved and AM sends never detect.
--   - The AM-send route stamps it after its own one-time detection
--     (sessions completed before this migration).
--
-- Trade-off: a buyer who switches language AFTER resolution isn't
-- re-detected (see frontend/docs/ARCHITECTURE.md § Language).
--
-- Nullable, no backfill: NULL simply means "not resolved yet", which is
-- exactly the old behaviour. The app tolerates this migration not being
-- applied yet (reads see undefined, the stamp write fails and is logged).

alter table public.chat_sessions
  add column if not exists language_resolved_at timestamptz;
