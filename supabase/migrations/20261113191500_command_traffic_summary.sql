-- Fixed-size response for the owner dashboard; never expose visitor records.
create or replace function public.command_traffic_summary(report_start timestamptz)
returns jsonb language sql stable security invoker set search_path = '' as $$
with traffic as materialized (
 select created_at, (created_at at time zone 'America/New_York')::date as day,
 coalesce(nullif(visitor_id::text,''), nullif(session_id::text,''), case when ip_hash <> '' then ip_hash || ':' || coalesce(user_agent,'') end,id::text) as visitor,
 session_id, path, referrer, user_agent, region, country
 from public.page_views where created_at >= report_start
 and coalesce(path,'/') !~ '^/(api|admin|command|dashboard|biz)(/|$)'
 and coalesce(user_agent,'') !~* 'bot|crawl|spider|headless|lighthouse|uptime|monitor|curl|wget'
), recent as materialized (select * from traffic where created_at >= now()-interval '30 days'),
dims as (
 select d.kind,d.label,count(*) as value from recent r cross join lateral (values
 ('pages',coalesce(nullif(split_part(split_part(regexp_replace(coalesce(path,''),'^https?://[^/]+',''),'?',1),'#',1),''),'/')),
 ('sources',case when coalesce(referrer,'')='' then 'Direct' else coalesce(nullif(regexp_replace(lower(substring(referrer from '^[[:alpha:]]+://([^/:?#]+)')),'^www\.',''),''),left(referrer,40)) end),
 ('devices',case when coalesce(user_agent,'')='' then 'Unknown' when user_agent ~* 'mobile|iphone|android|ipad|ipod' then 'Mobile' else 'Desktop' end),
 ('geo',case when country='US' then region end)
 ) d(kind,label) where d.label is not null group by d.kind,d.label
), ranked as (select *,row_number() over(partition by kind order by value desc,label) as rank from dims),
series as (select kind,jsonb_agg(jsonb_build_object('label',label,'value',value) order by rank) as items from ranked where rank<=6 or kind='geo' group by kind),
daily as (select day,count(distinct visitor) as n from recent where day >= (now() at time zone 'America/New_York')::date-13 group by day)
select jsonb_build_object('views',count(*),'sessions',count(distinct nullif(session_id::text,'')),
 'total',count(distinct visitor),'today',count(distinct visitor) filter(where day=(now() at time zone 'America/New_York')::date),
 'week',count(distinct visitor) filter(where created_at >= now()-interval '7 days'),
 'daily',(select jsonb_object_agg(to_char(day,'Mon FMDD'),n) from daily),
 'series',(select jsonb_object_agg(kind,items) from series)) from traffic
$$;
revoke all on function public.command_traffic_summary(timestamptz) from public,anon,authenticated;
grant execute on function public.command_traffic_summary(timestamptz) to service_role;
