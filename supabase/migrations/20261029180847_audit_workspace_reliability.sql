-- Additive, backwards-compatible workspace state. Existing RLS remains in force.
alter table public.contacts add column if not exists pipeline_stage text not null default 'new';
alter table public.contacts add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
alter table public.contacts add column if not exists consent_source text default '';
alter table public.contacts add column if not exists consent_at timestamptz;
alter table public.contacts add column if not exists follow_up_at timestamptz;
alter table public.contacts add column if not exists deal_value numeric(12,2) not null default 0;
alter table public.conversations add column if not exists archived boolean not null default false;
alter table public.appointments add column if not exists calendar_sync_error text;
create index if not exists contacts_campaign_id_idx on public.contacts(user_id,campaign_id);
create index if not exists contacts_pipeline_stage_idx on public.contacts(user_id,pipeline_stage);
create index if not exists conversations_archive_idx on public.conversations(user_id,archived,last_message_at desc);
-- Backfill only unambiguous matches. Duplicate names are never guessed.
update public.contacts c set campaign_id=x.id from public.campaigns x
where c.campaign_id is null and c.user_id=x.user_id and c.campaign=x.name
and (select count(*) from public.campaigns y where y.user_id=x.user_id and y.name=x.name)=1;

create or replace function public.contact_campaign_reference() returns trigger language plpgsql set search_path=public as $$
declare target_name text;
begin
 if new.campaign_id is not null then
  select name into target_name from public.campaigns where id=new.campaign_id and user_id=new.user_id;
  if not found then raise exception 'Campaign does not belong to this workspace'; end if;
  if TG_OP='INSERT' or new.campaign_id is distinct from old.campaign_id then new.campaign=target_name;
  elsif new.campaign is distinct from old.campaign and new.campaign is distinct from target_name then
   new.campaign_id=(select min(id::text)::uuid from public.campaigns where user_id=new.user_id and name=new.campaign having count(*)=1);
  end if;
 elsif new.campaign<>'' then
  new.campaign_id=(select min(id::text)::uuid from public.campaigns where user_id=new.user_id and name=new.campaign having count(*)=1);
 end if;
 return new;
end $$;
drop trigger if exists contact_campaign_reference on public.contacts;
create trigger contact_campaign_reference before insert or update of campaign,campaign_id on public.contacts for each row execute function public.contact_campaign_reference();
create or replace function public.sync_campaign_display_name() returns trigger language plpgsql set search_path=public as $$
begin
 update public.contacts set campaign=new.name where campaign_id=new.id and user_id=new.user_id;
 return new;
end $$;
drop trigger if exists sync_campaign_display_name on public.campaigns;
create trigger sync_campaign_display_name after update of name on public.campaigns for each row when(old.name is distinct from new.name) execute function public.sync_campaign_display_name();

-- Invoker privileges preserve existing owner/manager RLS. No service-role exposure.
create or replace function public.workspace_inbox_page(p_user_id uuid,p_search text default '',p_filter text default 'all',p_offset int default 0,p_limit int default 50)
returns jsonb language sql stable security invoker set search_path=public as $$
with matching as (
 select v.* from conversations v join contacts c on c.id=v.contact_id and c.user_id=v.user_id
 where v.user_id=p_user_id and
 (p_search='' or concat_ws(' ',c.first_name,c.last_name,c.phone,c.email,v.preview) ilike '%'||left(p_search,100)||'%') and
 (p_filter='all' or (p_filter='archived' and (v.archived or c.dnc)) or
 (not v.archived and not c.dnc and ((p_filter='inbox' and v.replied_at is not null) or (p_filter='unread' and v.unread>0) or (p_filter='ai' and (v.ai_enabled or v.agent_enabled or v.ai_replied_at is not null)))))
), paged as (select * from matching order by last_message_at desc,id limit greatest(1,least(p_limit,100)) offset greatest(p_offset,0))
select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb),'total',(select count(*) from matching));
$$;
revoke all on function public.workspace_inbox_page(uuid,text,text,int,int) from public,anon;
grant execute on function public.workspace_inbox_page(uuid,text,text,int,int) to authenticated,service_role;
create or replace function public.workspace_totals(p_user_id uuid) returns jsonb language sql stable security invoker set search_path=public as $$
select jsonb_build_object(
 'campaigns',(select count(*) from campaigns where user_id=p_user_id),
 'sent',(select coalesce(sum(sent),0) from campaigns where user_id=p_user_id),
 'replies',(select coalesce(sum(replies),0) from campaigns where user_id=p_user_id),
 'unread',(select coalesce(sum(unread),0) from conversations where user_id=p_user_id),
 'won',(select count(*) from contacts where user_id=p_user_id and pipeline_stage='won'),
 'revenue',(select coalesce(sum(deal_value),0) from contacts where user_id=p_user_id and pipeline_stage='won'),
 'booked',(select count(*) from appointments where user_id=p_user_id),
 'attended',(select count(*) from appointments where user_id=p_user_id and status='completed'),
 'no_show',(select count(*) from appointments where user_id=p_user_id and status='no_show')
);
$$;
revoke all on function public.workspace_totals(uuid) from public,anon;
grant execute on function public.workspace_totals(uuid) to authenticated,service_role;
