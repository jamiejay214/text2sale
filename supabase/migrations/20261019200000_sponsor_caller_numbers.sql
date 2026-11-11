-- Which of the sponsor's numbers an agent's dialer shows as caller ID
-- (app/api/dialer callerIds). The sponsor's dialer keeps the rest. Null
-- means the agent shares all of the sponsor's numbers.
alter table public.calling_sponsors add column if not exists caller_numbers jsonb;
