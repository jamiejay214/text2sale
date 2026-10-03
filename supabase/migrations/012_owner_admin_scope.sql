-- Owner-only administration, including direct authenticated database requests.
-- Apply through the normal migration process after reviewing the live schema.
begin;

-- Existing policies key off profiles.role. Remove the admin role from accounts
-- whose trusted Auth identity is not the verified owner before enforcing it.
update public.profiles p set role = 'user'
where p.role = 'admin' and not exists (
  select 1 from auth.users u where u.id = p.id
    and lower(u.email) = 'johnsonhealthquotes@gmail.com'
    and u.email_confirmed_at is not null
);

create or replace function public.enforce_owner_admin_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'admin' and not exists (
    select 1 from auth.users u where u.id = new.id
      and lower(u.email) = 'johnsonhealthquotes@gmail.com'
      and u.email_confirmed_at is not null
  ) then
    raise exception 'Only the verified workspace owner may hold the admin role';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_owner_admin_role() from public, anon, authenticated;
drop trigger if exists enforce_owner_admin_role on public.profiles;
create trigger enforce_owner_admin_role before insert or update on public.profiles
for each row execute function public.enforce_owner_admin_role();

-- An Auth email change must also revoke any existing admin authority.
create or replace function public.revoke_admin_on_identity_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if lower(coalesce(new.email, '')) <> 'johnsonhealthquotes@gmail.com'
     or new.email_confirmed_at is null then
    update public.profiles set role = 'user' where id = new.id and role = 'admin';
  end if;
  return new;
end;
$$;
revoke all on function public.revoke_admin_on_identity_change() from public, anon, authenticated;
drop trigger if exists revoke_admin_on_identity_change on auth.users;
create trigger revoke_admin_on_identity_change after update of email, email_confirmed_at on auth.users
for each row execute function public.revoke_admin_on_identity_change();
commit;
