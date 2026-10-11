-- Inbox tabs need to know two things the messages table can't answer cheaply:
--   replied_at    — the lead's last reply that wasn't an opt-out (Inbox tab)
--   ai_replied_at — the last time the AI texted back (AI handled tab)
-- The app sets both from now on; this backfills existing conversations.
-- Safe to run more than once.
alter table public.conversations add column if not exists replied_at timestamptz;
alter table public.conversations add column if not exists ai_replied_at timestamptz;

create index if not exists conversations_user_last_message_idx
  on public.conversations (user_id, last_message_at desc);
create index if not exists conversations_user_replied_idx
  on public.conversations (user_id, last_message_at desc) where replied_at is not null;

-- Last real reply per conversation. Opt-outs (STOP and the other mandatory
-- words) don't count, and opted-out contacts stay out of the Inbox.
update public.conversations c
set replied_at = r.last_reply
from (
  select m.conversation_id, max(m.created_at) as last_reply
  from public.messages m
  where m.direction = 'inbound'
    and upper(btrim(regexp_replace(coalesce(m.body, ''), '[^A-Za-z0-9]+', ' ', 'g')))
        !~ '(^| )(STOP|STOPALL|END|QUIT|CANCEL|UNSUBSCRIBE)( |$)'
  group by m.conversation_id
) r, public.contacts ct
where r.conversation_id = c.id
  and ct.id = c.contact_id
  and ct.dnc is not true
  and c.replied_at is null;

-- AI replies weren't marked before, so this is a best-effort guess: an
-- outbound text within two minutes of a reply, on an account or conversation
-- with AI turned on, that wasn't a campaign or scheduled text.
update public.conversations c
set ai_replied_at = a.last_ai
from (
  select o.conversation_id, max(o.created_at) as last_ai
  from public.messages o
  join public.conversations cc on cc.id = o.conversation_id
  join public.profiles p on p.id = cc.user_id
  where o.direction = 'outbound'
    and (p.ai_auto_reply is true or cc.ai_enabled is true)
    and exists (
      select 1 from public.messages i
      where i.conversation_id = o.conversation_id
        and i.direction = 'inbound'
        and i.created_at < o.created_at
        and i.created_at > o.created_at - interval '2 minutes'
    )
    and not exists (
      select 1 from public.scheduled_messages s
      where o.telnyx_message_id is not null and s.provider_message_id = o.telnyx_message_id
    )
  group by o.conversation_id
) a
where a.conversation_id = c.id
  and c.ai_replied_at is null;

notify pgrst, 'reload schema';
