-- Drop the AM-facing brief translation cache added in 0011. We no longer
-- translate the RFQ brief for the account manager — the sidebar renders the
-- buyer's original free-text values as submitted (chrome labels are still
-- localized via the static lib/cardStrings.ts / lib/amBriefStrings.ts
-- dictionaries, no Gemini involved). A future "download brief in language X"
-- feature can translate on demand without a persisted per-row cache.
--
-- Safe to apply anytime: the application code no longer reads or writes this
-- column. Message translation is unaffected — it lives on
-- chat_messages.metadata.translations / translated_content, not here.
alter table public.rfqs
  drop column if exists translations;
