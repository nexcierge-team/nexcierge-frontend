-- AM-facing translation cache for free-text RFQ brief fields, mirroring
-- chat_messages.metadata.translations. The AM dashboard reads a brief in a
-- chosen working language (zh/hi); each (rfq, language) pair is translated
-- at most once and cached here via the service-role admin client (the
-- rfqs_update_assigned_am policy would otherwise block an AM from writing
-- to a brief they haven't claimed yet).
--
-- Keyed by ISO 639-1 language code. Each value holds only the fields that
-- actually needed translation, e.g.:
--   {
--     "zh": {
--       "machine_type": "...",
--       "intended_application": "...",
--       "additional_notes": "...",
--       "technical_specifications": { "target_output": "..." }
--     }
--   }
alter table public.rfqs
  add column if not exists translations jsonb not null default '{}'::jsonb;
