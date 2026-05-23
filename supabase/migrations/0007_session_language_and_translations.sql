-- Buyer-selected output language for the session. The AI agent always
-- responds in this language regardless of the language the buyer types in;
-- account-manager messages are translated into it on the way to the buyer.
-- 'en' = no translation needed.
alter table public.chat_sessions
  add column if not exists language text not null default 'en';

-- Translation of `content` produced at AM send time. NULL when no
-- translation was needed (session.language was 'en' or the message is
-- an AI / system / user message). `translated_to` records the language
-- code the translation targeted so the buyer UI can ignore stale
-- translations if they switch language mid-session.
alter table public.chat_messages
  add column if not exists translated_content text,
  add column if not exists translated_to text;
