create or replace function public.command_visit_charts() returns jsonb
language sql stable security invoker set search_path='' as $$
with visits as materialized (
 select created_at,page,country,state as region from public.visitors where created_at>=now()-interval '30 days'
), origins as (select device_type,ref_source as source from public.partial_leads where created_at>=now()-interval '30 days'), dims as (
 select 'pages' kind,coalesce(nullif(split_part(split_part(regexp_replace(page,'^https?://[^/]+',''),'?',1),'#',1),''),'/') label,count(*) value from visits group by 2
 union all select 'geo',region,count(*) from visits where country='US' and region is not null group by 2
 union all select 'devices',coalesce(nullif(device_type,''),'Unknown'),count(*) from origins group by 2
 union all select 'sources',coalesce(nullif(source,''),'Direct'),count(*) from origins group by 2
), ranked as (select *,row_number() over(partition by kind order by value desc,label) r from dims),
series as (select kind,jsonb_agg(jsonb_build_object('label',label,'value',value) order by r) items from ranked where r<=6 or kind='geo' group by kind),
daily as (select (created_at at time zone 'America/New_York')::date as day,count(*) n from visits group by 1)
select jsonb_build_object('daily',(select jsonb_object_agg(to_char(day,'Mon FMDD'),n) from daily),'series',(select jsonb_object_agg(kind,items) from series))
$$;
revoke all on function public.command_visit_charts() from public,anon,authenticated;
grant execute on function public.command_visit_charts() to service_role;
