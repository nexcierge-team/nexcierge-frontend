-- Idempotency key for buyer-sent messages.
--
-- The client generates a UUID per send (crypto.randomUUID() in useChat)
-- and reuses it on retry. POST /api/chat inserts the user message with
-- this key; the unique index below turns a duplicate delivery (timeout
-- retry, flaky network, double submit) into a 23505 conflict, which the
-- route treats as "already processed" — it returns the existing row and
-- the AI reply that followed it instead of inserting a second copy and
-- burning a second Gemini turn.
--
-- Only user messages carry the key (ai / account_manager / system rows
-- are server-generated and leave it null), hence the partial index.

alter table public.chat_messages
  add column if not exists client_message_id text;

create unique index if not exists chat_messages_client_message_id_idx
  on public.chat_messages(chat_session_id, client_message_id)
  where client_message_id is not null;
