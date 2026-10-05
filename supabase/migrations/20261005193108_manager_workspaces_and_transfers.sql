-- Delegation is checked against live profile rows, never editable JWT metadata.
create or replace function private.can_manage_workspace(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
   select 1 from public.profiles actor join public.profiles member on member.id=target
   where actor.id=auth.uid() and not coalesce(actor.paused,false)
   and ((actor.role='admin' and lower(actor.email)='johnsonhealthquotes@gmail.com')
     or (actor.role='manager' and member.manager_id=actor.id and member.role<>'admin' and not coalesce(member.paused,false)))
 );
$$;
revoke all on function private.can_manage_workspace(uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.can_manage_workspace(uuid) to authenticated;

create table public.team_audit_events (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null,
 target_id uuid not null, action text not null, detail jsonb not null default '{}',
 created_at timestamptz not null default now()
);
alter table public.team_audit_events enable row level security;
revoke all on public.team_audit_events from anon,authenticated;
grant select on public.team_audit_events to authenticated;
grant all on public.team_audit_events to service_role;
create policy team_audit_read on public.team_audit_events for select to authenticated using
 (actor_id=auth.uid() or target_id=auth.uid() or private.can_manage_workspace(actor_id));
create index team_audit_actor_time on public.team_audit_events(actor_id,created_at desc);

create table public.team_fund_transfers (
 id uuid primary key default gen_random_uuid(), sender_id uuid not null references public.profiles(id),
 recipient_id uuid not null references public.profiles(id), amount numeric(14,2) not null check(amount>0),
 request_id uuid not null, created_at timestamptz not null default now(), unique(sender_id,request_id),
 check(sender_id<>recipient_id)
);
alter table public.team_fund_transfers enable row level security;
revoke all on public.team_fund_transfers from anon,authenticated;
grant select on public.team_fund_transfers to authenticated;
grant all on public.team_fund_transfers to service_role;
create policy team_transfers_read on public.team_fund_transfers for select to authenticated using
 (sender_id=auth.uid() or recipient_id=auth.uid() or private.can_manage_workspace(sender_id));
create index team_transfers_recipient_time on public.team_fund_transfers(recipient_id,created_at desc);

-- Server-only atomic transfer. Stable lock order prevents deadlocks. A replay
-- returns the existing receipt; it never debits again or creates a new deposit.
create function public.transfer_team_funds(p_actor uuid,p_recipient uuid,p_cents bigint,p_request uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor public.profiles; recipient public.profiles; receipt public.team_fund_transfers; amount numeric;
begin
 if p_actor=p_recipient or p_cents is null or p_cents<=0 or p_cents>100000000 or p_request is null then raise exception 'Invalid transfer'; end if;
 perform id from public.profiles where id in(p_actor,p_recipient) order by id for update;
 select * into actor from public.profiles where id=p_actor;
 select * into recipient from public.profiles where id=p_recipient;
 if actor.id is null or recipient.id is null or actor.role not in('manager','admin') or coalesce(actor.paused,false)
   or recipient.manager_id is distinct from p_actor or recipient.role='admin' or coalesce(recipient.paused,false) then raise exception 'Transfer access denied'; end if;
 select * into receipt from public.team_fund_transfers where sender_id=p_actor and request_id=p_request;
 amount := p_cents::numeric/100;
 if receipt.id is not null then
   if receipt.recipient_id<>p_recipient or receipt.amount<>amount then raise exception 'Transfer request already used'; end if;
   return to_jsonb(receipt);
 end if;
 if coalesce(actor.wallet_balance,0)<amount then raise exception 'Insufficient balance'; end if;
 insert into public.team_fund_transfers(sender_id,recipient_id,amount,request_id) values(p_actor,p_recipient,amount,p_request) returning * into receipt;
 update public.profiles set wallet_balance=wallet_balance-amount,
 usage_history=jsonb_build_array(jsonb_build_object('id',receipt.id,'type','charge','amount',amount,'description','Team transfer to '||recipient.email,'createdAt',now(),'status','succeeded'))||coalesce(usage_history,'[]'::jsonb) where id=p_actor;
 update public.profiles set wallet_balance=coalesce(wallet_balance,0)+amount,
 usage_history=jsonb_build_array(jsonb_build_object('id',receipt.id,'type','fund_add','amount',amount,'description','Team transfer from '||actor.email,'createdAt',now(),'status','succeeded'))||coalesce(usage_history,'[]'::jsonb) where id=p_recipient;
 insert into public.team_audit_events(actor_id,target_id,action,detail) values(p_actor,p_recipient,'fund_transfer',jsonb_build_object('transfer_id',receipt.id,'amount',amount));
 return to_jsonb(receipt);
end; $$;
revoke all on function public.transfer_team_funds(uuid,uuid,bigint,uuid) from public,anon,authenticated;
grant execute on function public.transfer_team_funds(uuid,uuid,bigint,uuid) to service_role;

-- Team changes always use the verified actor, not an impersonated profile.
create function public.change_team_membership(p_actor uuid,p_code text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare member public.profiles; manager public.profiles;
begin
 select * into member from public.profiles where id=p_actor for update;
 if member.id is null or member.role<>'user' or coalesce(member.paused,false) then raise exception 'Only active individual accounts can join a team'; end if;
 if p_code is null then
  update public.profiles set manager_id=null where id=p_actor;
  insert into public.team_audit_events(actor_id,target_id,action) values(p_actor,p_actor,'leave_team');
  return jsonb_build_object('success',true);
 end if;
 if member.manager_id is not null then raise exception 'Leave your current team before joining another'; end if;
 select * into manager from public.profiles where role='manager' and not coalesce(paused,false)
  and (upper(nullif(team_code,''))=upper(trim(p_code)) or upper(referral_code)=upper(trim(p_code))) limit 1 for share;
 if manager.id is null or manager.id=p_actor then raise exception 'Invalid manager team code'; end if;
 update public.profiles set manager_id=manager.id where id=p_actor;
 insert into public.team_audit_events(actor_id,target_id,action,detail) values(p_actor,manager.id,'join_team',jsonb_build_object('manager_id',manager.id));
 return jsonb_build_object('success',true,'managerName',concat_ws(' ',manager.first_name,manager.last_name));
end; $$;
revoke all on function public.change_team_membership(uuid,text) from public,anon,authenticated;
grant execute on function public.change_team_membership(uuid,text) to service_role;

-- Replace legacy team predicates which failed to check the manager's current role.
do $$ declare t text; pol record; begin
 foreach t in array array['contacts','campaigns','conversations','calls','message_templates','scheduled_messages','appointments','csv_uploads','integrations'] loop
  for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
   execute format('drop policy %I on public.%I',pol.policyname,t);
  end loop;
  execute format('create policy workspace_access on public.%I for all to authenticated using (user_id=auth.uid() or private.can_manage_workspace(user_id)) with check (user_id=auth.uid() or private.can_manage_workspace(user_id))',t);
 end loop;
 for pol in select policyname from pg_policies where schemaname='public' and tablename='messages' loop
  execute format('drop policy %I on public.messages',pol.policyname);
 end loop;
end $$;
create policy workspace_messages on public.messages for all to authenticated
 using (exists(select 1 from public.conversations c where c.id=conversation_id and (c.user_id=auth.uid() or private.can_manage_workspace(c.user_id))))
 with check (exists(select 1 from public.conversations c where c.id=conversation_id and (c.user_id=auth.uid() or private.can_manage_workspace(c.user_id))));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
 using(id=auth.uid() or private.can_manage_workspace(id)) with check(id=auth.uid() or private.can_manage_workspace(id));
create policy team_read_numbers on public.owned_phone_numbers for select to authenticated using(private.can_manage_workspace(user_id));
create policy team_read_ai_calls on public.ai_call_sessions for select to authenticated using(private.can_manage_workspace(user_id));

create function private.audit_workspace_change() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; row_data jsonb; begin
 row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 if auth.uid() is null then return coalesce(new,old); end if;
 if tg_table_name='messages' then
  select user_id into target from public.conversations where id=(row_data->>'conversation_id')::uuid;
  if tg_op='UPDATE' and new.conversation_id<>old.conversation_id then raise exception 'Cannot move a message to another conversation'; end if;
 else
  target:=(row_data->>'user_id')::uuid;
  if tg_op='UPDATE' and new.user_id<>old.user_id then raise exception 'Cannot change workspace ownership'; end if;
 end if;
 if target<>auth.uid() then
  if not private.can_manage_workspace(target) then raise exception 'Workspace access denied'; end if;
  insert into public.team_audit_events(actor_id,target_id,action,detail) values(auth.uid(),target,'workspace_change',jsonb_build_object('table',tg_table_name,'operation',tg_op,'record_id',row_data->>'id'));
 end if;
 return coalesce(new,old);
end; $$;
revoke all on function private.audit_workspace_change() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['contacts','campaigns','conversations','messages','calls','message_templates','scheduled_messages','appointments','csv_uploads','integrations'] loop
 execute format('create trigger team_workspace_audit before insert or update or delete on public.%I for each row execute function private.audit_workspace_change()',t);
 end loop;
end $$;

-- Existing sensitive-field protection stays in place. Add missing privilege
-- fields and restrict delegated profile changes to operational preferences.
create function private.guard_delegated_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return new; end if;
 if exists(select 1 from public.profiles where id=auth.uid() and role='admin' and lower(email)='johnsonhealthquotes@gmail.com') then return new; end if;
 if (to_jsonb(new)->'team_code') is distinct from (to_jsonb(old)->'team_code') or
    (to_jsonb(new)->'free_ai_plan') is distinct from (to_jsonb(old)->'free_ai_plan') then raise exception 'Cannot modify protected profile fields'; end if;
 if old.id<>auth.uid() then
  if not private.can_manage_workspace(old.id) then raise exception 'Workspace access denied'; end if;
  if (to_jsonb(new)-array['first_name','last_name','phone','opt_out_settings','quiet_hours_enabled','quiet_hours_start_hour','quiet_hours_end_hour','tag_library','ai_instructions','ai_auto_reply','available_hours','appointment_reminders','business_description','business_logo_url','updated_at'])
   is distinct from (to_jsonb(old)-array['first_name','last_name','phone','opt_out_settings','quiet_hours_enabled','quiet_hours_start_hour','quiet_hours_end_hour','tag_library','ai_instructions','ai_auto_reply','available_hours','appointment_reminders','business_description','business_logo_url','updated_at']) then raise exception 'Managers can edit operational settings only'; end if;
  insert into public.team_audit_events(actor_id,target_id,action) values(auth.uid(),old.id,'profile_update');
 end if;
 return new;
end; $$;
revoke all on function private.guard_delegated_profile() from public,anon,authenticated;
create trigger team_profile_guard before update on public.profiles for each row execute function private.guard_delegated_profile();
-- Public business pages are rendered server-side with an explicit public-field
-- projection. Do not expose full private profiles to anonymous visitors.
drop policy if exists "Public read of business pages" on public.profiles;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using(id=auth.uid() or private.can_manage_workspace(id));
-- Auth's trusted signup trigger creates profiles; clients cannot insert roles.
drop policy if exists profiles_insert on public.profiles;
