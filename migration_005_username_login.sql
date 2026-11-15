-- Run once (safe to re-run). Lets people sign in with their username as well as their email.
-- NOTE: this lets anyone who knows a username look up that account's sign-in email. Each user can turn it off
-- in the account-switcher window ("Let people log in with just my username").
alter table public.profiles add column if not exists username_login boolean not null default true;
grant update (username_login) on public.profiles to authenticated;
create or replace function public.login_email(p_login text) returns text
language sql stable security definer set search_path = public, auth as $$
  select u.email::text from auth.users u join public.profiles p on p.id = u.id
  where lower(p.username) = lower(trim(p_login)) and p.username_login limit 1
$$;
revoke execute on function public.login_email(text) from public;
grant execute on function public.login_email(text) to anon, authenticated;
