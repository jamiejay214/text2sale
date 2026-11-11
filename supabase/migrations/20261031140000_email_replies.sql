-- Email replies in Conversations.
--
-- Each verified sender gets a Telnyx inbox (on Telnyx's shared inbound
-- domain, so no DNS changes). Campaigns use it as their Reply-To; a cron job
-- collects replies into the contact's conversation, and replies sent from the
-- inbox go out by email. Text messages are unchanged (channel 'sms').

alter table public.messages
  add column if not exists channel text not null default 'sms' check (channel in ('sms', 'email')),
  add column if not exists email_subject text check (email_subject is null or length(email_subject) <= 300),
  add column if not exists email_message_id text check (email_message_id is null or length(email_message_id) <= 500),
  add column if not exists email_address text check (email_address is null or length(email_address) <= 254);

-- Inbound emails are collected by polling; this keeps each one stored once.
create unique index if not exists messages_email_provider_idx on public.messages (telnyx_message_id) where channel = 'email';

alter table public.email_senders
  add column if not exists inbox_id text,
  add column if not exists inbox_address text check (inbox_address is null or length(inbox_address) <= 254),
  add column if not exists inbox_polled_at timestamptz,
  add column if not exists notify_replies boolean not null default true;
