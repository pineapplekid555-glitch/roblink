-- =====================================================================
-- Roblink database schema for Supabase
-- Paste this whole file into: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to run once on a fresh project.
-- =====================================================================

-- ---------- PROFILES ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{2,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 32),
  color text not null default '#5865f2',
  avatar_url text,
  banner_url text,
  banner_color text default '#5865f2',
  about text not null default '' check (char_length(about) <= 190),
  pronouns text not null default '' check (char_length(pronouns) <= 20),
  status text not null default 'online' check (status in ('online','idle','dnd','invisible')),
  custom_status text not null default '' check (char_length(custom_status) <= 60),
  plus boolean not null default false,
  plus_since timestamptz,
  boosts_left int not null default 0,
  platform_role text not null default 'user' check (platform_role in ('user','moderator','admin','owner')),
  suspended boolean not null default false,
  suspended_reason text,
  created_at timestamptz not null default now()
);

create or replace function public.platform_rank(r text) returns int language sql immutable as $$
  select case r when 'owner' then 4 when 'admin' then 3 when 'moderator' then 2 else 1 end
$$;

create or replace function public.is_staff(min_role text default 'moderator') returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select platform_rank(platform_role) >= platform_rank(min_role) and not suspended
                   from profiles where id = auth.uid()), false)
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare u text; d text;
begin
  u := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email,''),'@',1)), '[^a-z0-9_.]', '', 'g'));
  if length(u) < 2 then u := 'user' || substr(replace(new.id::text,'-',''),1,6); end if;
  u := left(u, 20);
  if exists (select 1 from profiles where username = u) then
    u := left(u, 14) || substr(replace(new.id::text,'-',''),1,5);
  end if;
  d := left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''), u), 32);
  insert into profiles (id, username, display_name, color)
  values (new.id, u, d, coalesce(new.raw_user_meta_data->>'color', '#5865f2'));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.username_available(u text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where username = lower(u))
$$;

-- ---------- SERVERS ----------
create table public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  icon text not null default '?' check (char_length(icon) <= 4),
  icon_url text,
  color text not null default '#5865f2',
  description text not null default '' check (char_length(description) <= 150),
  owner_id uuid not null references profiles(id),
  invite_code text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,8),
  is_public boolean not null default false,
  boosts int not null default 0,
  banner_color text default '#5865f2',
  banner_url text,
  verification text not null default 'low',
  explicit_filter text not null default 'members',
  everyone_perms jsonb not null default '{"SEND":true,"REACT":true,"ATTACH":true,"INVITE":true}',
  automod jsonb not null default '{"on":false,"words":[]}',
  bots text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  color text not null default '#99aab5',
  perms jsonb not null default '{}',
  position int not null default 0,
  hoist boolean not null default false
);
create index on public.roles (server_id);

create table public.server_members (
  server_id uuid not null references servers(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  nickname text not null default '' check (char_length(nickname) <= 32),
  role_ids uuid[] not null default '{}',
  timeout_until timestamptz,
  joined_at timestamptz not null default now(),
  primary key (server_id, user_id)
);
create index on public.server_members (user_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  position int not null default 0
);
create index on public.categories (server_id);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null check (char_length(name) between 1 and 30),
  type text not null default 'text' check (type in ('text','voice')),
  topic text not null default '' check (char_length(topic) <= 120),
  position int not null default 0
);
create index on public.channels (server_id);

create table public.emojis (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  name text not null check (name ~ '^[a-z0-9_]{2,20}$'),
  url text not null,
  unique (server_id, name)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  code text not null unique,
  created_by uuid references profiles(id) on delete set null,
  uses int not null default 0,
  max_uses int not null default 0,
  created_at timestamptz not null default now()
);

create table public.bans (
  server_id uuid not null references servers(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  reason text not null default '',
  banned_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (server_id, user_id)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  server_id uuid not null references servers(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  text text not null,
  created_at timestamptz not null default now()
);
create index on public.audit_log (server_id, created_at desc);

create table public.boosts (
  server_id uuid not null references servers(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  count int not null default 0,
  primary key (server_id, user_id)
);

-- ---------- DMs / FRIENDS ----------
create table public.dms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table public.dm_members (
  dm_id uuid not null references dms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (dm_id, user_id)
);
create index on public.dm_members (user_id);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index friendships_pair on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table public.blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  primary key (blocker_id, blocked_id)
);

-- ---------- MESSAGES ----------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id) on delete cascade,
  dm_id uuid references dms(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  kind text not null default 'user' check (kind in ('user','sys','bot')),
  bot_id text,
  content text not null default '',
  image_url text,
  reply_to uuid,
  pinned boolean not null default false,
  poll jsonb,
  embed jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  check ((channel_id is not null)::int + (dm_id is not null)::int = 1),
  check (char_length(content) <= 4000)
);
create index on public.messages (channel_id, created_at desc);
create index on public.messages (dm_id, created_at desc);

create table public.reactions (
  message_id uuid not null references messages(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 40),
  primary key (message_id, user_id, emoji)
);

create table public.read_state (
  user_id uuid not null references profiles(id) on delete cascade,
  conv_id uuid not null,
  last_read timestamptz not null default now(),
  primary key (user_id, conv_id)
);

-- ---------- STAFF / REPORTS ----------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  reported_user_id uuid references profiles(id) on delete set null,
  message_id uuid,
  server_id uuid,
  snapshot text not null default '',
  reason text not null default '' check (char_length(reason) <= 500),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  handled_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.staff_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  target text,
  detail text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- HELPER FUNCTIONS (security definer so RLS policies can use them)
-- =====================================================================
create or replace function public.is_member(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from server_members where server_id = sid and user_id = auth.uid())
$$;

create or replace function public.in_dm(did uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from dm_members where dm_id = did and user_id = auth.uid())
$$;

create or replace function public.has_perm(sid uuid, p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from servers s where s.id = sid and s.owner_id = auth.uid())
  or (
    exists (select 1 from server_members m where m.server_id = sid and m.user_id = auth.uid())
    and (
      exists (select 1 from servers s where s.id = sid
              and (coalesce((s.everyone_perms->>p)::boolean, false) or coalesce((s.everyone_perms->>'ADMIN')::boolean, false)))
      or exists (select 1 from server_members m join roles r on r.id = any(m.role_ids) and r.server_id = sid
                 where m.server_id = sid and m.user_id = auth.uid()
                 and (coalesce((r.perms->>p)::boolean, false) or coalesce((r.perms->>'ADMIN')::boolean, false)))
    )
  )
$$;

-- lower number = more powerful. owner = -1, no roles = 999
create or replace function public.member_rank(sid uuid, uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from servers where id = sid and owner_id = uid) then -1
    else coalesce((select min(r.position) from server_members m join roles r on r.id = any(m.role_ids) and r.server_id = sid
                   where m.server_id = sid and m.user_id = uid), 999)
  end
$$;

create or replace function public.channel_server(cid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select server_id from channels where id = cid
$$;

create or replace function public.channel_has_bot(cid uuid, b text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select b = any(s.bots) from channels c join servers s on s.id = c.server_id where c.id = cid), false)
$$;

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

create or replace function public.can_read_message(mid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from messages m left join channels c on c.id = m.channel_id
    where m.id = mid
    and ((c.server_id is not null and is_member(c.server_id)) or (m.dm_id is not null and in_dm(m.dm_id)))
  )
$$;

create or replace function public.can_post(cid uuid, did uuid, has_image boolean) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare sid uuid; other uuid;
begin
  if exists (select 1 from profiles where id = auth.uid() and suspended) then return false; end if;
  if cid is not null then
    select server_id into sid from channels where id = cid;
    if sid is null or not is_member(sid) or not has_perm(sid, 'SEND') then return false; end if;
    if exists (select 1 from server_members where server_id = sid and user_id = auth.uid() and timeout_until > now()) then return false; end if;
    if has_image and not has_perm(sid, 'ATTACH') then return false; end if;
    return true;
  else
    if not in_dm(did) then return false; end if;
    for other in select user_id from dm_members where dm_id = did and user_id <> auth.uid() loop
      if is_blocked_between(auth.uid(), other) then return false; end if;
    end loop;
    return true;
  end if;
end $$;

create or replace function public.log_audit_sys(sid uuid, t text) returns void
language sql security definer set search_path = public as $$
  insert into audit_log (server_id, actor_id, text) values (sid, auth.uid(), t)
$$;

-- =====================================================================
-- TRIGGERS
-- =====================================================================
create or replace function public.messages_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare am jsonb; sbots text[]; w text;
begin
  if new.kind = 'user' and char_length(new.content) > 2000
     and not coalesce((select plus from profiles where id = new.author_id), false) then
    raise exception 'Message too long (2000 max, 4000 with Roblink Plus)';
  end if;
  if new.kind = 'user' and new.channel_id is not null then
    select s.automod, s.bots into am, sbots from channels c join servers s on s.id = c.server_id where c.id = new.channel_id;
    if coalesce((am->>'on')::boolean, false) and 'modbot' = any(sbots) then
      for w in select jsonb_array_elements_text(coalesce(am->'words', '[]'::jsonb)) loop
        if w <> '' and position(lower(w) in lower(new.content)) > 0 then
          raise exception 'Message blocked by AutoMod';
        end if;
      end loop;
    end if;
  end if;
  return new;
end $$;
create trigger messages_guard_t before insert on public.messages for each row execute function public.messages_guard();

-- stop people granting permissions they do not have, or editing roles above themselves
create or replace function public.roles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text; v jsonb; myrank int;
begin
  if tg_op = 'DELETE' then return old; end if;
  if auth.uid() is null then return new; end if;
  if exists (select 1 from servers where id = new.server_id and owner_id = auth.uid()) then return new; end if;
  myrank := member_rank(new.server_id, auth.uid());
  if new.position <= myrank then raise exception 'You cannot create or move a role above your own highest role'; end if;
  for k, v in select * from jsonb_each(new.perms) loop
    if v = 'true'::jsonb and not has_perm(new.server_id, k) then
      raise exception 'You cannot grant a permission you do not have (%)', k;
    end if;
  end loop;
  return new;
end $$;
create trigger roles_guard_t before insert or update on public.roles for each row execute function public.roles_guard();

create or replace function public.emoji_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare b int; lvl int;
begin
  select boosts into b from servers where id = new.server_id;
  lvl := case when b >= 14 then 3 when b >= 7 then 2 when b >= 2 then 1 else 0 end;
  if (select count(*) from emojis where server_id = new.server_id) >= 50 + lvl * 50 then
    raise exception 'No emoji slots left - boost the server for more';
  end if;
  return new;
end $$;
create trigger emoji_limit_t before insert on public.emojis for each row execute function public.emoji_limit();

-- automatic audit log for admin actions (cannot be forged by clients)
create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare sid uuid; msg text; j jsonb; verb text; nm text;
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  j := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  nm := j->>'name';
  verb := case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'edited' else 'deleted' end;
  if tg_table_name = 'servers' then
    sid := (j->>'id')::uuid; msg := 'updated server settings';
  else
    sid := (j->>'server_id')::uuid;
    msg := case tg_table_name
      when 'channels' then verb || ' channel ' || nm
      when 'categories' then verb || ' category ' || nm
      when 'roles' then verb || ' role ' || nm
      when 'emojis' then verb || ' emoji :' || nm || ':'
      when 'bans' then 'removed a ban'
      when 'invites' then 'revoked an invite'
    end;
  end if;
  if sid is not null and exists (select 1 from servers where id = sid) then
    insert into audit_log (server_id, actor_id, text) values (sid, auth.uid(), msg);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger audit_channels after insert or update or delete on public.channels for each row execute function public.audit_trigger();
create trigger audit_categories after insert or update or delete on public.categories for each row execute function public.audit_trigger();
create trigger audit_roles after insert or update or delete on public.roles for each row execute function public.audit_trigger();
create trigger audit_emojis after insert or delete on public.emojis for each row execute function public.audit_trigger();
create trigger audit_bans after delete on public.bans for each row execute function public.audit_trigger();
create trigger audit_invites after delete on public.invites for each row execute function public.audit_trigger();
create trigger audit_servers after update on public.servers for each row execute function public.audit_trigger();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table profiles enable row level security;
alter table servers enable row level security;
alter table roles enable row level security;
alter table server_members enable row level security;
alter table categories enable row level security;
alter table channels enable row level security;
alter table emojis enable row level security;
alter table invites enable row level security;
alter table bans enable row level security;
alter table audit_log enable row level security;
alter table boosts enable row level security;
alter table dms enable row level security;
alter table dm_members enable row level security;
alter table friendships enable row level security;
alter table blocks enable row level security;
alter table messages enable row level security;
alter table reactions enable row level security;
alter table read_state enable row level security;
alter table reports enable row level security;
alter table staff_log enable row level security;

-- profiles
create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_update_own on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- servers
create policy servers_read on servers for select to authenticated using (is_member(id) or is_public or is_staff());
create policy servers_update on servers for update to authenticated using (has_perm(id, 'MANAGE_SERVER')) with check (has_perm(id, 'MANAGE_SERVER'));

-- roles
create policy roles_read on roles for select to authenticated using (is_member(server_id) or is_staff());
create policy roles_write on roles for all to authenticated
  using (has_perm(server_id, 'MANAGE_ROLES')
         and (member_rank(server_id, auth.uid()) = -1 or position > member_rank(server_id, auth.uid())))
  with check (has_perm(server_id, 'MANAGE_ROLES'));

-- members
create policy members_read on server_members for select to authenticated using (is_member(server_id) or is_staff());
create policy members_update_self on server_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- categories / channels
create policy cats_read on categories for select to authenticated using (is_member(server_id) or is_staff());
create policy cats_write on categories for all to authenticated using (has_perm(server_id, 'MANAGE_CHANNELS')) with check (has_perm(server_id, 'MANAGE_CHANNELS'));
create policy chans_read on channels for select to authenticated using (is_member(server_id) or is_staff());
create policy chans_write on channels for all to authenticated using (has_perm(server_id, 'MANAGE_CHANNELS')) with check (has_perm(server_id, 'MANAGE_CHANNELS'));

-- emoji
create policy emojis_read on emojis for select to authenticated using (is_member(server_id));
create policy emojis_write on emojis for all to authenticated using (has_perm(server_id, 'MANAGE_EMOJI')) with check (has_perm(server_id, 'MANAGE_EMOJI'));

-- invites
create policy invites_read on invites for select to authenticated using (has_perm(server_id, 'INVITE'));
create policy invites_delete on invites for delete to authenticated using (has_perm(server_id, 'MANAGE_SERVER') or created_by = auth.uid());

-- bans / audit / boosts
create policy bans_read on bans for select to authenticated using (has_perm(server_id, 'BAN'));
create policy bans_delete on bans for delete to authenticated using (has_perm(server_id, 'BAN'));
create policy audit_read on audit_log for select to authenticated using (has_perm(server_id, 'MANAGE_SERVER') or is_staff('admin'));
create policy boosts_read on boosts for select to authenticated using (user_id = auth.uid());

-- dms / friends / blocks
create policy dms_read on dms for select to authenticated using (in_dm(id));
create policy dm_members_read on dm_members for select to authenticated using (in_dm(dm_id));
create policy friends_read on friendships for select to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy friends_insert on friendships for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending' and not is_blocked_between(requester_id, addressee_id));
create policy friends_accept on friendships for update to authenticated using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());
create policy friends_delete on friendships for delete to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy blocks_all on blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- messages
create policy messages_read on messages for select to authenticated using (
  (channel_id is not null and is_member(channel_server(channel_id)))
  or (dm_id is not null and in_dm(dm_id)));
create policy messages_insert on messages for insert to authenticated with check (
  author_id = auth.uid() and kind in ('user','bot') and can_post(channel_id, dm_id, image_url is not null)
  and (kind = 'user' or (channel_id is not null and channel_has_bot(channel_id, bot_id)))
);
create policy messages_edit on messages for update to authenticated using (author_id = auth.uid() and kind = 'user') with check (author_id = auth.uid());
create policy messages_delete on messages for delete to authenticated using (
  author_id = auth.uid()
  or (channel_id is not null and has_perm(channel_server(channel_id), 'MANAGE_MESSAGES')));

create policy reactions_read on reactions for select to authenticated using (can_read_message(message_id));
create policy reactions_insert on reactions for insert to authenticated with check (user_id = auth.uid() and can_read_message(message_id));
create policy reactions_delete on reactions for delete to authenticated using (user_id = auth.uid());

create policy read_state_all on read_state for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports / staff log
create policy reports_insert on reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_read on reports for select to authenticated using (reporter_id = auth.uid() or is_staff());
create policy staff_log_read on staff_log for select to authenticated using (is_staff());

-- =====================================================================
-- TABLE PRIVILEGES  (column-level so users cannot edit protected columns)
-- =====================================================================
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
grant update (display_name, color, avatar_url, banner_url, banner_color, about, pronouns, status, custom_status) on profiles to authenticated;
grant update (name, icon, icon_url, color, description, is_public, banner_color, banner_url, verification, explicit_filter, automod, bots) on servers to authenticated;
grant insert, update, delete on roles to authenticated;
grant update (nickname) on server_members to authenticated;
grant insert, update, delete on categories, channels, emojis to authenticated;
grant delete on invites, bans to authenticated;
grant insert, delete on friendships to authenticated;
grant update (status) on friendships to authenticated;
grant insert, delete on blocks to authenticated;
grant insert on messages to authenticated;
grant update (content, edited_at) on messages to authenticated;
grant delete on messages to authenticated;
grant insert, delete on reactions to authenticated;
grant insert, update on read_state to authenticated;
grant insert on reports to authenticated;

-- =====================================================================
-- RPC FUNCTIONS  (the only way to do privileged things)
-- =====================================================================
create or replace function public.sys_message(cid uuid, t text) returns void
language sql security definer set search_path = public as $$
  insert into messages (channel_id, author_id, kind, content) values (cid, auth.uid(), 'sys', t)
$$;

create or replace function public.first_text_channel(sid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from channels where server_id = sid and type = 'text'
  order by (name = 'general') desc, position limit 1
$$;

create or replace function public.create_server(p_name text, p_template text default 'gaming', p_bots boolean default true) returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid; cat uuid; tpl jsonb; c jsonb; n text; pos int := 0; cpos int := 0; adm uuid; modr uuid; botr uuid; me uuid := auth.uid(); nm text; first_ch uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from profiles where id = me and suspended) then raise exception 'Account suspended'; end if;
  if (select count(*) from servers where owner_id = me) >= 20 then raise exception 'You can own at most 20 servers'; end if;
  nm := trim(p_name);
  if nm = '' or char_length(nm) > 40 then raise exception 'Invalid server name'; end if;
  tpl := case p_template
    when 'gaming' then '[["Info",["welcome","rules","announcements"],[]],["Text Channels",["general","clips","looking-for-group","memes"],[]],["Voice Channels",[],["Lobby","Squad 1","Squad 2"]]]'
    when 'friends' then '[["Text Channels",["general","photos","plans"],[]],["Voice Channels",[],["Hangout","AFK"]]]'
    when 'study' then '[["Info",["announcements","resources"],[]],["Study",["general","homework-help","off-topic"],[]],["Focus Rooms",[],["Silent Study","Group Study"]]]'
    when 'creators' then '[["Info",["welcome","rules"],[]],["Showcase",["general","showcase","feedback","collabs"],[]],["Voice",[],["Studio","Lounge"]]]'
    else '[["Text Channels",["general"],[]],["Voice Channels",[],["General"]]]' end::jsonb;
  insert into servers (name, icon, owner_id, color, bots)
    values (nm, upper(left(nm, 1)),
            me, (array['#5865f2','#3ba55d','#ed4245','#faa61a','#eb459e','#f47b67','#00b0f4','#9b59b6'])[1 + floor(random() * 8)::int],
            case when p_bots then array['modbot','dicebot'] else '{}'::text[] end)
    returning id into sid;
  insert into server_members (server_id, user_id) values (sid, me);
  insert into roles (server_id, name, color, perms, position, hoist) values (sid, 'Admin', '#ef4444', '{"ADMIN":true}', 0, true) returning id into adm;
  insert into roles (server_id, name, color, perms, position, hoist) values (sid, 'Moderator', '#3b82f6', '{"KICK":true,"BAN":true,"TIMEOUT":true,"MANAGE_MESSAGES":true}', 1, true) returning id into modr;
  for c in select * from jsonb_array_elements(tpl) loop
    insert into categories (server_id, name, position) values (sid, c->>0, cpos) returning id into cat; cpos := cpos + 1;
    for n in select jsonb_array_elements_text(c->1) loop
      insert into channels (server_id, category_id, name, type, position) values (sid, cat, n, 'text', pos); pos := pos + 1;
    end loop;
    for n in select jsonb_array_elements_text(c->2) loop
      insert into channels (server_id, category_id, name, type, position) values (sid, cat, n, 'voice', pos); pos := pos + 1;
    end loop;
  end loop;
  insert into audit_log (server_id, actor_id, text) values (sid, me, 'created the server');
  first_ch := first_text_channel(sid);
  insert into messages (channel_id, author_id, kind, bot_id, content)
    values (first_ch, me, 'bot', case when p_bots then 'modbot' else null end,
            'Welcome to **' || nm || '**! Open Server Settings from the server name to add roles, bots and emoji.')
    ;
  if not p_bots then update messages set kind = 'sys' where channel_id = first_ch; end if;
  return sid;
end $$;

create or replace function public.join_server(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid; me uuid := auth.uid(); v_code text := lower(trim(p_code)); inv invites; nm text; ch uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from profiles where id = me and suspended) then raise exception 'Account suspended'; end if;
  select id into sid from servers where invite_code = v_code;
  if sid is null then
    select * into inv from invites where invites.code = v_code;
    if inv.id is null or (inv.max_uses > 0 and inv.uses >= inv.max_uses) then raise exception 'Invite is invalid or has expired'; end if;
    sid := inv.server_id;
  end if;
  if exists (select 1 from bans where server_id = sid and user_id = me) then raise exception 'You are banned from this server'; end if;
  if not exists (select 1 from server_members where server_id = sid and user_id = me) then
    insert into server_members (server_id, user_id) values (sid, me);
    if inv.id is not null then update invites set uses = uses + 1 where id = inv.id; end if;
    select display_name into nm from profiles where id = me;
    ch := first_text_channel(sid);
    if ch is not null then perform sys_message(ch, '**' || nm || '** just joined the server. Say hi!'); end if;
  end if;
  return sid;
end $$;

create or replace function public.leave_server(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from servers where id = sid and owner_id = auth.uid()) then
    raise exception 'Owners cannot leave. Delete the server or transfer ownership first.';
  end if;
  delete from server_members where server_id = sid and user_id = auth.uid();
end $$;

create or replace function public.delete_server(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare u record;
begin
  if not exists (select 1 from servers where id = sid and owner_id = auth.uid()) then raise exception 'Only the owner can delete this server'; end if;
  for u in select user_id, count from boosts where server_id = sid loop
    update profiles set boosts_left = boosts_left + u.count where id = u.user_id;
  end loop;
  delete from servers where id = sid;
end $$;

create or replace function public.transfer_ownership(sid uuid, new_owner uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from servers where id = sid and owner_id = auth.uid()) then raise exception 'Only the owner can do that'; end if;
  if not exists (select 1 from server_members where server_id = sid and user_id = new_owner) then raise exception 'That user is not a member'; end if;
  update servers set owner_id = new_owner where id = sid;
  perform log_audit_sys(sid, 'transferred ownership');
end $$;

create or replace function public.mod_guard(sid uuid, target uuid, perm text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if target = auth.uid() then raise exception 'You cannot do that to yourself'; end if;
  if not has_perm(sid, perm) then raise exception 'You do not have the % permission', perm; end if;
  if member_rank(sid, auth.uid()) >= member_rank(sid, target) then raise exception 'You cannot manage someone with an equal or higher role'; end if;
end $$;

create or replace function public.kick_member(sid uuid, target uuid, reason text default '') returns void
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  perform mod_guard(sid, target, 'KICK');
  select display_name into nm from profiles where id = target;
  delete from server_members where server_id = sid and user_id = target;
  perform log_audit_sys(sid, 'kicked ' || nm || case when reason <> '' then ' (' || reason || ')' else '' end);
  perform sys_message(first_text_channel(sid), '**' || nm || '** was kicked.');
end $$;

create or replace function public.ban_member(sid uuid, target uuid, reason text default '') returns void
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  perform mod_guard(sid, target, 'BAN');
  select display_name into nm from profiles where id = target;
  delete from server_members where server_id = sid and user_id = target;
  insert into bans (server_id, user_id, reason, banned_by) values (sid, target, coalesce(reason,''), auth.uid())
    on conflict (server_id, user_id) do update set reason = excluded.reason;
  perform log_audit_sys(sid, 'banned ' || nm || case when reason <> '' then ' (' || reason || ')' else '' end);
  perform sys_message(first_text_channel(sid), '**' || nm || '** was banned.');
end $$;

create or replace function public.timeout_member(sid uuid, target uuid, seconds int) returns void
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  perform mod_guard(sid, target, 'TIMEOUT');
  select display_name into nm from profiles where id = target;
  update server_members set timeout_until = case when seconds > 0 then now() + make_interval(secs => seconds) else null end
    where server_id = sid and user_id = target;
  perform log_audit_sys(sid, case when seconds > 0 then 'timed out ' else 'removed timeout from ' end || nm);
end $$;

create or replace function public.set_member_roles(sid uuid, target uuid, new_roles uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare old_roles uuid[]; changed uuid[]; r uuid; myrank int := member_rank(sid, auth.uid());
begin
  if not has_perm(sid, 'MANAGE_ROLES') then raise exception 'You do not have the MANAGE_ROLES permission'; end if;
  if myrank <> -1 and target <> auth.uid() and myrank >= member_rank(sid, target) then raise exception 'You cannot manage someone with an equal or higher role'; end if;
  select role_ids into old_roles from server_members where server_id = sid and user_id = target;
  if old_roles is null then raise exception 'Not a member'; end if;
  select coalesce(array_agg(x), '{}') into changed from (
    (select unnest(new_roles) except select unnest(old_roles)) union (select unnest(old_roles) except select unnest(new_roles))) t(x);
  foreach r in array changed loop
    if not exists (select 1 from roles where id = r and server_id = sid) then raise exception 'Unknown role'; end if;
    if myrank <> -1 and (select position from roles where id = r) <= myrank then raise exception 'You cannot assign a role at or above your own'; end if;
  end loop;
  update server_members set role_ids = new_roles where server_id = sid and user_id = target;
  perform log_audit_sys(sid, 'changed roles for ' || (select display_name from profiles where id = target));
end $$;

create or replace function public.set_everyone_perms(sid uuid, perms jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare k text; v jsonb;
begin
  if not has_perm(sid, 'MANAGE_ROLES') then raise exception 'You do not have the MANAGE_ROLES permission'; end if;
  if not exists (select 1 from servers where id = sid and owner_id = auth.uid()) then
    for k, v in select * from jsonb_each(perms) loop
      if v = 'true'::jsonb and not has_perm(sid, k) then raise exception 'You cannot grant a permission you do not have (%)', k; end if;
    end loop;
  end if;
  update servers set everyone_perms = perms where id = sid;
  perform log_audit_sys(sid, 'updated @everyone permissions');
end $$;

create or replace function public.pin_message(mid uuid, pin boolean) returns void
language plpgsql security definer set search_path = public as $$
declare m messages;
begin
  select * into m from messages where id = mid;
  if m.id is null then raise exception 'Message not found'; end if;
  if m.channel_id is not null then
    if not has_perm(channel_server(m.channel_id), 'MANAGE_MESSAGES') then raise exception 'You need Manage Messages to pin'; end if;
  elsif not in_dm(m.dm_id) then raise exception 'Not allowed'; end if;
  update messages set pinned = pin where id = mid;
end $$;

create or replace function public.create_invite(sid uuid, max int default 0) returns text
language plpgsql security definer set search_path = public as $$
declare c text := substr(replace(gen_random_uuid()::text,'-',''),1,7);
begin
  if not has_perm(sid, 'INVITE') then raise exception 'You do not have permission to create invites'; end if;
  insert into invites (server_id, code, created_by, max_uses) values (sid, c, auth.uid(), coalesce(max,0));
  perform log_audit_sys(sid, 'created an invite');
  return c;
end $$;

create or replace function public.boost_server(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from server_members where server_id = sid and user_id = auth.uid()) then raise exception 'Join the server first'; end if;
  if not exists (select 1 from profiles where id = auth.uid() and plus and boosts_left > 0) then raise exception 'You need Roblink Plus and a free boost'; end if;
  update profiles set boosts_left = boosts_left - 1 where id = auth.uid();
  insert into boosts (server_id, user_id, count) values (sid, auth.uid(), 1) on conflict (server_id, user_id) do update set count = boosts.count + 1;
  update servers set boosts = boosts + 1 where id = sid;
  perform log_audit_sys(sid, 'boosted the server');
end $$;

create or replace function public.unboost_server(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from boosts where server_id = sid and user_id = auth.uid() and count > 0) then raise exception 'You have no boost here'; end if;
  update boosts set count = count - 1 where server_id = sid and user_id = auth.uid();
  update profiles set boosts_left = boosts_left + 1 where id = auth.uid();
  update servers set boosts = greatest(boosts - 1, 0) where id = sid;
end $$;

-- DEMO ONLY: lets any user toggle Plus for free. Replace with a payment webhook (e.g. Stripe) before going live.
create or replace function public.set_plus_demo(on_ boolean) returns void
language plpgsql security definer set search_path = public as $$
declare b record;
begin
  if on_ then
    update profiles set plus = true, plus_since = coalesce(plus_since, now()), boosts_left = 2 where id = auth.uid() and not plus;
  else
    for b in select server_id, count from boosts where user_id = auth.uid() and count > 0 loop
      update servers set boosts = greatest(boosts - b.count, 0) where id = b.server_id;
    end loop;
    delete from boosts where user_id = auth.uid();
    update profiles set plus = false, boosts_left = 0 where id = auth.uid();
  end if;
end $$;

create or replace function public.open_dm(other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare did uuid; me uuid := auth.uid();
begin
  if other = me then raise exception 'You cannot DM yourself'; end if;
  if not exists (select 1 from profiles where id = other) then raise exception 'User not found'; end if;
  select a.dm_id into did from dm_members a join dm_members b on a.dm_id = b.dm_id
    where a.user_id = me and b.user_id = other
    and (select count(*) from dm_members x where x.dm_id = a.dm_id) = 2 limit 1;
  if did is null then
    if is_blocked_between(me, other) then raise exception 'You cannot message this user'; end if;
    insert into dms default values returning id into did;
    insert into dm_members (dm_id, user_id) values (did, me), (did, other);
  end if;
  return did;
end $$;

create or replace function public.report_message(mid uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare m messages; sid uuid;
begin
  select * into m from messages where id = mid;
  if m.id is null or not can_read_message(mid) then raise exception 'Message not found'; end if;
  if m.channel_id is not null then sid := channel_server(m.channel_id); end if;
  insert into reports (reporter_id, reported_user_id, message_id, server_id, snapshot, reason)
    values (auth.uid(), m.author_id, mid, sid, left(m.content, 1000), left(coalesce(p_reason,''), 500));
end $$;

create or replace function public.unread_counts() returns table (conv_id uuid, n bigint, m bigint)
language sql stable security definer set search_path = public as $$
  with me as (select id, username from profiles where id = auth.uid()),
  convs as (
    select c.id as cid, null::uuid as did, sm.joined_at as since
      from channels c join server_members sm on sm.server_id = c.server_id and sm.user_id = auth.uid() where c.type = 'text'
    union all
    select null::uuid, d.dm_id, d.joined_at from dm_members d where d.user_id = auth.uid())
  select coalesce(cv.cid, cv.did) as conv_id, count(*) as n,
         count(*) filter (where cv.did is not null or msg.content ilike '%@' || (select username from me) || '%' or msg.content ilike '%@everyone%') as m
  from convs cv
  join messages msg on (msg.channel_id = cv.cid or msg.dm_id = cv.did)
  left join read_state rs on rs.user_id = auth.uid() and rs.conv_id = coalesce(cv.cid, cv.did)
  where msg.author_id <> auth.uid() and msg.created_at > coalesce(rs.last_read, cv.since)
  group by 1
$$;

-- ---------- STAFF RPCs ----------
create or replace function public.staff_log_write(a text, t text, d text default '') returns void
language sql security definer set search_path = public as $$
  insert into staff_log (actor_id, action, target, detail) values (auth.uid(), a, t, d)
$$;

create or replace function public.staff_set_suspended(target uuid, flag boolean, why text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff('moderator') then raise exception 'Staff only'; end if;
  if target = auth.uid() then raise exception 'You cannot suspend yourself'; end if;
  if platform_rank((select platform_role from profiles where id = target)) >= platform_rank((select platform_role from profiles where id = auth.uid())) then
    raise exception 'You cannot act on someone of equal or higher staff rank';
  end if;
  update profiles set suspended = flag, suspended_reason = case when flag then why else null end where id = target;
  perform staff_log_write(case when flag then 'suspend' else 'unsuspend' end, target::text, why);
end $$;

create or replace function public.staff_set_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff('owner') then raise exception 'Only the platform owner can change staff roles'; end if;
  if new_role not in ('user','moderator','admin','owner') then raise exception 'Bad role'; end if;
  if target = auth.uid() then raise exception 'You cannot change your own role'; end if;
  update profiles set platform_role = new_role where id = target;
  perform staff_log_write('set_role', target::text, new_role);
end $$;

create or replace function public.staff_delete_message(mid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff('moderator') then raise exception 'Staff only'; end if;
  delete from messages where id = mid;
  perform staff_log_write('delete_message', mid::text);
end $$;

create or replace function public.staff_delete_server(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if not is_staff('admin') then raise exception 'Admins only'; end if;
  select name into nm from servers where id = sid;
  delete from servers where id = sid;
  perform staff_log_write('delete_server', sid::text, nm);
end $$;

create or replace function public.staff_resolve_report(rid uuid, new_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff('moderator') then raise exception 'Staff only'; end if;
  if new_status not in ('resolved','dismissed','open') then raise exception 'Bad status'; end if;
  update reports set status = new_status, handled_by = auth.uid() where id = rid;
  perform staff_log_write('report_' || new_status, rid::text);
end $$;

create or replace function public.staff_stats() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff('moderator') then raise exception 'Staff only'; end if;
  return jsonb_build_object(
    'users', (select count(*) from profiles),
    'servers', (select count(*) from servers),
    'messages', (select count(*) from messages),
    'messages_24h', (select count(*) from messages where created_at > now() - interval '24 hours'),
    'open_reports', (select count(*) from reports where status = 'open'),
    'suspended', (select count(*) from profiles where suspended));
end $$;

grant execute on all functions in schema public to authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.username_available(text) to anon, authenticated;
-- internal helpers are not meant to be called directly by clients
revoke execute on function public.handle_new_user(), public.roles_guard(), public.messages_guard(), public.emoji_limit(),
  public.sys_message(uuid, text), public.first_text_channel(uuid), public.log_audit_sys(uuid, text), public.mod_guard(uuid, uuid, text),
  public.staff_log_write(text, text, text), public.audit_trigger() from authenticated;

-- =====================================================================
-- STORAGE (avatars, banners, emoji, uploads)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800, array['image/png','image/jpeg','image/gif','image/webp'])
on conflict (id) do nothing;

create policy "media upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media public read" on storage.objects for select to anon, authenticated using (bucket_id = 'media');

-- =====================================================================
-- REALTIME
-- =====================================================================
do $$ declare t text; begin
  foreach t in array array['messages','reactions','server_members','servers','channels','categories','roles','emojis','friendships','blocks','dm_members','profiles','bans','reports'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
alter table public.channels replica identity full;
alter table public.categories replica identity full;
alter table public.roles replica identity full;
alter table public.emojis replica identity full;
alter table public.servers replica identity full;
alter table public.server_members replica identity full;
alter table public.friendships replica identity full;
alter table public.blocks replica identity full;
alter table public.dm_members replica identity full;
alter table public.messages replica identity full;
alter table public.reactions replica identity full;

-- =====================================================================
-- MAKE YOURSELF THE PLATFORM OWNER (run AFTER you have signed up in the app)
-- Replace YOUR_USERNAME, then run this single line in the SQL editor:
--
--   update public.profiles set platform_role = 'owner' where username = 'YOUR_USERNAME';
--
-- =====================================================================
