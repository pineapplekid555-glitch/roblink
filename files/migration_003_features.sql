-- Roblink migration 003 - safe to re-run. Run once in Supabase SQL Editor (after schema.sql / migration_002).
-- Adds: monthly boosts, folders layout, channel overrides, discovery rules, invite expiry,
-- auto-join, custom bots, 2FA-aware staff, super reactions, plus styling, mod tools.

-- ---------- monthly boosts ----------
alter table public.profiles add column if not exists boost_month date;
create or replace function public.refresh_boosts() returns int
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); p profiles; m date := date_trunc('month', now())::date;
begin
  select * into p from profiles where id = me;
  if p.id is null then return 0; end if;
  if p.boost_month is null or p.boost_month < m then
    update servers s set boosts = greatest(0, s.boosts - b.count) from boosts b where b.server_id = s.id and b.user_id = me;
    delete from boosts where user_id = me;
    update profiles set boost_month = m, boosts_left = tier_boosts(coalesce(plus_tier,0)) where id = me;
  end if;
  return (select boosts_left from profiles where id = me);
end $$;

-- ---------- server folders / order (per user) ----------
create table if not exists public.user_layout (user_id uuid primary key references profiles(id) on delete cascade, layout jsonb not null default '[]');
alter table public.user_layout enable row level security;
drop policy if exists ul_all on public.user_layout;
create policy ul_all on public.user_layout for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- channel permission overrides (roles + members) ----------
create table if not exists public.channel_overrides (
  channel_id uuid not null references channels(id) on delete cascade,
  target_type text not null check (target_type in ('role','member')),
  target_id uuid not null,
  can_view boolean, can_send boolean,
  primary key (channel_id, target_type, target_id));
alter table public.channel_overrides enable row level security;
drop policy if exists co_read on public.channel_overrides;
create policy co_read on public.channel_overrides for select to authenticated using (is_member((select server_id from channels where id = channel_id)));
create or replace function public.set_channel_override(cid uuid, ttype text, tid uuid, v boolean, s boolean) returns void
language plpgsql security definer set search_path = public as $$
declare sid uuid := (select server_id from channels where id = cid);
begin
  if not has_perm(sid, 'MANAGE_CHANNELS') then raise exception 'No permission'; end if;
  if v is null and s is null then delete from channel_overrides where channel_id = cid and target_type = ttype and target_id = tid;
  else insert into channel_overrides values (cid, ttype, tid, v, s)
    on conflict (channel_id, target_type, target_id) do update set can_view = v, can_send = s; end if;
end $$;
-- true when the caller may do `what` ('view'|'send') in channel cid (member override > role override > default)
create or replace function public.chan_ok(cid uuid, what text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare sid uuid; me uuid := auth.uid(); r boolean; mem server_members; col text := case when what='send' then 'can_send' else 'can_view' end;
begin
  select server_id into sid from channels where id = cid;
  if sid is null then return true; end if;
  if exists (select 1 from servers where id = sid and owner_id = me) or has_perm(sid,'ADMIN') then return true; end if;
  select * into mem from server_members where server_id = sid and user_id = me;
  execute format('select %I from channel_overrides where channel_id=$1 and target_type=''member'' and target_id=$2', col) into r using cid, me;
  if r is not null then return r; end if;
  execute format('select bool_or(%I) from channel_overrides where channel_id=$1 and target_type=''role'' and target_id = any($2)', col)
    into r using cid, coalesce(mem.role_ids,'{}');
  return coalesce(r, true);
end $$;
drop policy if exists msg_chan_view on public.messages;
create policy msg_chan_view on public.messages as restrictive for select to authenticated using (channel_id is null or chan_ok(channel_id,'view'));
drop policy if exists msg_chan_send on public.messages;
create policy msg_chan_send on public.messages as restrictive for insert to authenticated with check (channel_id is null or kind <> 'user' or chan_ok(channel_id,'send'));

-- ---------- discovery requirements + invites ----------
alter table public.invites add column if not exists expires_at timestamptz;
create or replace function public.discovery_status(sid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'members', (select count(*) from server_members where server_id = sid), 'need_members', 10,
    'age_days', (select extract(day from now() - created_at)::int from servers where id = sid), 'need_age', 7,
    'has_description', (select char_length(description) >= 20 from servers where id = sid),
    'has_icon', (select icon_url is not null from servers where id = sid),
    'bans_ok', true)
$$;
create or replace function public.discovery_guard() returns trigger language plpgsql as $$
declare d jsonb;
begin
  if new.is_public and (tg_op = 'INSERT' or not old.is_public) then
    d := discovery_status(new.id);
    if tg_op = 'UPDATE' and ((d->>'members')::int < 10 or (d->>'age_days')::int < 7 or not (d->>'has_description')::boolean or not (d->>'has_icon')::boolean) then
      raise exception 'Discovery needs: 10+ members, 7+ days old, a 20+ char description and an icon';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_discovery on public.servers;
create trigger trg_discovery before update on public.servers for each row execute function public.discovery_guard();
create or replace function public.create_invite_ex(sid uuid, max int default 0, hours int default 0) returns text
language plpgsql security definer set search_path = public as $$
declare c text := substr(replace(gen_random_uuid()::text,'-',''),1,7);
begin
  if not has_perm(sid,'INVITE') then raise exception 'You do not have permission to create invites'; end if;
  insert into invites (server_id, code, created_by, max_uses, expires_at) values (sid, c, auth.uid(), coalesce(max,0), case when hours > 0 then now() + make_interval(hours => hours) end);
  return c;
end $$;
create or replace function public.invite_guard() returns trigger language plpgsql as $$
begin
  if old.expires_at is not null and old.expires_at < now() then raise exception 'Invite is invalid or has expired'; end if;
  return new;
end $$;
drop trigger if exists trg_invite_exp on public.invites;
create trigger trg_invite_exp before update on public.invites for each row execute function public.invite_guard();

-- ---------- auto-join (platform server) ----------
create or replace function public.set_autojoin(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff('owner') then raise exception 'Owner only'; end if;
  insert into app_config values ('autojoin_server', to_jsonb(sid::text)) on conflict (key) do update set value = excluded.value;
end $$;
create or replace function public.autojoin_me() returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid; me uuid := auth.uid();
begin
  select (value #>> '{}')::uuid into sid from app_config where key = 'autojoin_server';
  if sid is null or me is null or exists (select 1 from bans where server_id = sid and user_id = me) then return null; end if;
  insert into server_members (server_id, user_id) values (sid, me) on conflict do nothing;
  return sid;
end $$;

-- ---------- custom bots ----------
create table if not exists public.custom_bots (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  color text not null default '#7c5cff',
  commands jsonb not null default '[]',
  created_at timestamptz not null default now());
alter table public.custom_bots enable row level security;
drop policy if exists cb_read on public.custom_bots;
create policy cb_read on public.custom_bots for select to authenticated using (is_member(server_id));
drop policy if exists cb_write on public.custom_bots;
create policy cb_write on public.custom_bots for all to authenticated using (has_perm(server_id,'MANAGE_SERVER')) with check (has_perm(server_id,'MANAGE_SERVER'));

-- ---------- super reactions + plus styling ----------
alter table public.reactions add column if not exists super boolean not null default false;
create or replace function public.super_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.super and not exists (select 1 from profiles where id = new.user_id and plus_tier >= 1) then raise exception 'Super reactions need Roblink Plus'; end if;
  if new.super and (select count(*) from reactions where user_id = new.user_id and super and message_id in (select id from messages where created_at > date_trunc('month', now()))) >= 5 * greatest(1,(select plus_tier from profiles where id = new.user_id)) then raise exception 'Monthly super reaction limit reached'; end if;
  return new;
end $$;
drop trigger if exists trg_super on public.reactions;
create trigger trg_super before insert on public.reactions for each row execute function public.super_guard();

create table if not exists public.plus_style (
  user_id uuid primary key references profiles(id) on delete cascade,
  tag text check (char_length(tag) <= 5), name_color text, name_color2 text, effect text);
alter table public.plus_style enable row level security;
drop policy if exists ps_read on public.plus_style;
create policy ps_read on public.plus_style for select to authenticated using (true);
drop policy if exists ps_write on public.plus_style;
create policy ps_write on public.plus_style for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and exists (select 1 from profiles where id = auth.uid() and plus_tier >= 1));

-- ---------- 2FA-aware staff ----------
alter table public.profiles add column if not exists mfa_required boolean not null default false;
create or replace function public.set_mfa_flag(b boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if b and not exists (select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified') then raise exception 'Set up an authenticator app first'; end if;
  update profiles set mfa_required = b where id = auth.uid();
end $$;
create or replace function public.is_staff(min_role text default 'moderator') returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select platform_rank(platform_role) >= platform_rank(min_role) and not suspended
                   and (not mfa_required or coalesce(auth.jwt()->>'aal','') = 'aal2')
                   from profiles where id = auth.uid()), false)
$$;

-- ---------- easier moderation ----------
create or replace function public.staff_find_user(q text) returns table(id uuid, username text, display_name text, suspended boolean, platform_role text, msgs bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.suspended, p.platform_role, (select count(*) from messages m where m.author_id = p.id)
  from profiles p where is_staff('moderator') and (p.username ilike '%'||q||'%' or p.display_name ilike '%'||q||'%') limit 20
$$;
create or replace function public.staff_purge_user(target uuid, hours int default 24) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_staff('moderator') then raise exception 'Staff only'; end if;
  if platform_rank((select platform_role from profiles where id = target)) >= platform_rank((select platform_role from profiles where id = auth.uid())) then raise exception 'Cannot act on equal or higher staff'; end if;
  delete from messages where author_id = target and created_at > now() - make_interval(hours => hours);
  get diagnostics n = row_count;
  perform staff_log_write('purge_user', target::text, 'deleted '||n||' messages');
  return n;
end $$;

grant execute on function public.refresh_boosts(), public.set_channel_override(uuid,text,uuid,boolean,boolean), public.discovery_status(uuid),
  public.create_invite_ex(uuid,int,int), public.set_autojoin(uuid), public.autojoin_me(), public.set_mfa_flag(boolean),
  public.staff_find_user(text), public.staff_purge_user(uuid,int), public.chan_ok(uuid,text) to authenticated;
