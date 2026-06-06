-- 008_messages_error_code.sql
-- Applied to prod 2026-06-06.
--
-- The delivery-receipt handlers write a carrier error code onto failed
-- messages, but the column didn't exist, so every FAILED delivery receipt's
-- UPDATE was rejected and the status was never recorded. Add the column, and
-- index telnyx_message_id so receipts can match the exact message by the id we
-- store at send time (accurate even for multi-message threads).
alter table public.messages
  add column if not exists error_code text;

create index if not exists idx_messages_telnyx_message_id
  on public.messages (telnyx_message_id)
  where telnyx_message_id is not null;
