alter table public.command_notifications drop constraint command_notifications_kind_check;
alter table public.command_notifications add constraint command_notifications_kind_check check(kind in('visit','signup','support','test'));
create index if not exists support_messages_thread_time on public.support_messages(user_id,created_at desc);
create function private.notify_command_support() returns trigger language plpgsql security definer set search_path='' as $$
declare display_name text; begin
 if new.sender_role<>'user' then return new; end if;
 select coalesce(nullif(btrim(concat_ws(' ',first_name,last_name)),''),email,'A customer') into display_name from public.profiles where id=new.user_id;
 insert into public.command_notifications(event_key,kind,title,body,url)
 values('support:'||new.id,'support','New customer chat message',left(coalesce(display_name,'A customer'),120)||' sent you a message. Open Command Center to reply.','/command?chat='||new.user_id)
 on conflict(event_key) do nothing;
 begin perform private.dispatch_command_notifications(); exception when others then raise warning 'Support notification queued for retry'; end;
 return new;
end; $$;
revoke all on function private.notify_command_support() from public,anon,authenticated,service_role;
create trigger command_support_notification after insert on public.support_messages for each row execute function private.notify_command_support();

-- Service-only thread summary, ordered by latest activity with unread counts.
create function public.command_support_threads() returns table(user_id uuid,first_name text,last_name text,email text,message text,created_at timestamptz,unread bigint)
language sql security invoker set search_path='' as $$
 select latest.user_id,p.first_name,p.last_name,p.email,latest.message,latest.created_at,
 (select count(*) from public.support_messages s where s.user_id=latest.user_id and s.sender_role='user' and not s.read)
 from (select distinct on (s.user_id) s.user_id,s.message,s.created_at from public.support_messages s order by s.user_id,s.created_at desc,s.id desc) latest
 left join public.profiles p on p.id=latest.user_id order by latest.created_at desc limit 100;
$$;
revoke all on function public.command_support_threads() from public,anon,authenticated;
grant execute on function public.command_support_threads() to service_role;
