-- =====================================================================
-- PART 2: Plus tiers, boost packs, staff grants, demo-purchase switch, vanity invites
-- Safe to run more than once. If you already ran the original schema.sql,
-- paste ONLY this file into the Supabase SQL Editor and run it.
-- =====================================================================

-- ---------- plan tier on profiles (0 none, 1 Lite, 2 Plus, 3 Max) ----------
alter table public.profiles add column if not exists plus_tier int not null default 0;
do $$ begin
  alter table public.profiles add constraint profiles_plus_tier_check check (plus_tier between 0 and 3);
exception when duplicate_object then null; end $$;
update public.profiles set plus_tier = 2 where plus and plus_tier = 0;

-- ---------- app-wide switches (owner controlled) ----------
create table if not exists public.app_config (key text primary key, value jsonb not null);
alter table public.app_config enable row level security;
drop policy if exists app_config_read on public.app_config;
create policy app_config_read on public.app_config for select to authenticated using (true);
insert into public.app_config (key, value) values ('demo_purchases', 'true') on conflict do nothing;
revoke all on public.app_config from anon, authenticated;
grant select on public.app_config to authenticated;

create or replace function public.demo_enabled() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select value = 'true'::jsonb from app_config where key = 'demo_purchases'), false)
$$;

-- ---------- boost accounting ----------
create or replace function public.tier_boosts(t int) returns int language sql immutable as $$
  select case t when 1 then 1 when 2 then 3 when 3 then 6 else 0 end
$$;

create or replace function public.remove_boosts(uid uuid, n int) returns void
language plpgsql security definer set search_path = public as $$
declare take int; b record; rem int := n;
begin
  take := least(rem, coalesce((select boosts_left from profiles where id = uid), 0));
  update profiles set boosts_left = boosts_left - take where id = uid;
  rem := rem - take;
  for b in select server_id, count from boosts where user_id = uid and count > 0 order by count desc loop
    exit when rem <= 0;
    take := least(rem, b.count);
    update boosts set count = count - take where server_id = b.server_id and user_id = uid;
    update servers set boosts = greatest(boosts - take, 0) where id = b.server_id;
    rem := rem - take;
  end loop;
end $$;

create or replace function public.apply_tier(uid uuid, t int) returns void
language plpgsql security definer set search_path = public as $$
declare old int; delta int;
begin
  select plus_tier into old from profiles where id = uid;
  if old is null then raise exception 'User not found'; end if;
  delta := tier_boosts(t) - tier_boosts(old);
  update profiles set plus_tier = t, plus = (t > 0),
    plus_since = case when t > 0 then coalesce(plus_since, now()) else null end where id = uid;
  if delta > 0 then update profiles set boosts_left = boosts_left + delta where id = uid;
  elsif delta < 0 then perform remove_boosts(uid, -delta); end if;
end $$;

-- DEMO purchases: free while app_config.demo_purchases = true. Replace with a payment webhook (e.g. Stripe) before charging.
drop function if exists public.set_plus_demo(boolean);
create or replace function public.set_plan_demo(t int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if t < 0 or t > 3 then raise exception 'Unknown plan'; end if;
  if t > 0 and not demo_enabled() then raise exception 'Purchases are not open yet - ask Roblink staff'; end if;
  perform apply_tier(auth.uid(), t);
end $$;

create or replace function public.buy_boosts_demo(n int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if n < 1 or n > 14 then raise exception 'Bad boost pack'; end if;
  if not demo_enabled() then raise exception 'Purchases are not open yet - ask Roblink staff'; end if;
  update profiles set boosts_left = boosts_left + n where id = auth.uid();
end $$;

-- boosting no longer requires a Plus tier, only a free boost
create or replace function public.boost_server(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from server_members where server_id = sid and user_id = auth.uid()) then raise exception 'Join the server first'; end if;
  if not exists (select 1 from profiles where id = auth.uid() and boosts_left > 0) then raise exception 'You have no boosts left - get a Plus plan or a boost pack'; end if;
  update profiles set boosts_left = boosts_left - 1 where id = auth.uid();
  insert into boosts (server_id, user_id, count) values (sid, auth.uid(), 1) on conflict (server_id, user_id) do update set count = boosts.count + 1;
  update servers set boosts = boosts + 1 where id = sid;
  perform log_audit_sys(sid, 'boosted the server');
end $$;

-- ---------- staff: grant plans / boosts (platform OWNER only) ----------
create or replace function public.staff_grant_plan(target uuid, t int, extra_boosts int default 0) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff('owner') then raise exception 'Only the platform owner can grant plans or boosts'; end if;
  if t < 0 or t > 3 then raise exception 'Unknown plan'; end if;
  if not exists (select 1 from profiles where id = target) then raise exception 'User not found'; end if;
  if abs(coalesce(extra_boosts, 0)) > 1000 then raise exception 'Too many boosts at once'; end if;
  perform apply_tier(target, t);
  if coalesce(extra_boosts, 0) > 0 then update profiles set boosts_left = boosts_left + extra_boosts where id = target;
  elsif coalesce(extra_boosts, 0) < 0 then perform remove_boosts(target, -extra_boosts); end if;
  perform staff_log_write('grant_plan', target::text, 'tier ' || t || ', extra boosts ' || coalesce(extra_boosts, 0));
end $$;

create or replace function public.staff_set_demo(flag boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff('owner') then raise exception 'Only the platform owner can do that'; end if;
  insert into app_config (key, value) values ('demo_purchases', to_jsonb(flag))
    on conflict (key) do update set value = excluded.value;
  perform staff_log_write('demo_purchases', null, flag::text);
end $$;

-- ---------- banner images need Plus (tier 2+), enforced server-side ----------
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and new.banner_url is not null and new.banner_url is distinct from old.banner_url and new.plus_tier < 2 then
    raise exception 'Profile banner images need Roblink Plus or higher';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_t on public.profiles;
create trigger profiles_guard_t before update on public.profiles for each row execute function public.profiles_guard();

-- ---------- vanity invite code (server Boost Level 3 = 14 boosts) ----------
create or replace function public.set_vanity(sid uuid, code text) returns void
language plpgsql security definer set search_path = public as $$
declare c text := lower(trim(code));
begin
  if not has_perm(sid, 'MANAGE_SERVER') then raise exception 'You need the Manage Server permission'; end if;
  if (select boosts from servers where id = sid) < 14 then raise exception 'Custom invite codes need Boost Level 3 (14 boosts)'; end if;
  if c !~ '^[a-z0-9-]{3,20}$' then raise exception 'Use 3-20 letters, numbers or dashes'; end if;
  begin
    update servers set invite_code = c where id = sid;
  exception when unique_violation then raise exception 'That invite code is already taken';
  end;
  perform log_audit_sys(sid, 'set a custom invite code');
end $$;

-- ---------- permissions for the new functions ----------
revoke execute on function public.demo_enabled(), public.tier_boosts(int), public.remove_boosts(uuid, int), public.apply_tier(uuid, int),
  public.set_plan_demo(int), public.buy_boosts_demo(int), public.boost_server(uuid), public.staff_grant_plan(uuid, int, int),
  public.staff_set_demo(boolean), public.profiles_guard(), public.set_vanity(uuid, text) from public, anon;
grant execute on function public.demo_enabled(), public.set_plan_demo(int), public.buy_boosts_demo(int), public.boost_server(uuid),
  public.staff_grant_plan(uuid, int, int), public.staff_set_demo(boolean), public.set_vanity(uuid, text) to authenticated;
revoke execute on function public.tier_boosts(int), public.remove_boosts(uuid, int), public.apply_tier(uuid, int), public.profiles_guard() from authenticated;
