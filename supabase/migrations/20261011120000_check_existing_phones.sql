-- Lead import duplicate check. UploadWorkspace has called this function
-- since the import page was rebuilt, but no migration ever created it, so on
-- a fresh database the check failed silently: every re-upload imported (and
-- charged for) the same leads again. Runs as the caller, so the contacts
-- row-level security decides whose numbers can be checked.
drop function if exists public.check_existing_phones(uuid, text[]);
create function public.check_existing_phones(p_user_id uuid, p_phones_last10 text[])
returns setof text
language sql
stable
set search_path = ''
as $$
  select distinct right(regexp_replace(c.phone, '\D', '', 'g'), 10)
  from public.contacts c
  where c.user_id = p_user_id
    and right(regexp_replace(c.phone, '\D', '', 'g'), 10) = any(p_phones_last10);
$$;
revoke all on function public.check_existing_phones(uuid, text[]) from public, anon;
grant execute on function public.check_existing_phones(uuid, text[]) to authenticated, service_role;
