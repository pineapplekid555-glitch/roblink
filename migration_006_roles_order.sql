-- =====================================================================
-- PART 6: auto roles, bot roles, welcome message, drag-to-reorder (channels, categories, roles)
-- Run in the Supabase SQL Editor after 003/004/005. Safe to run more than once.
-- =====================================================================
alter table public.servers add column if not exists auto_roles uuid[] not null default '{}';
alter table public.servers add column if not exists bot_roles jsonb not null default '{}';
alter table public.servers add column if not exists welcome jsonb not null default '{}';

-- caller may use role r (must sit below their own top role unless they own the server)
create or replace function public.can_use_role(sid uuid, r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from roles where id = r and server_id = sid)
     and (member_rank(sid, auth.uid()) = -1 or (select position from roles where id = r) > member_rank(sid, auth.uid()))
$$;

create or replace function public.set_auto_roles(sid uuid, ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare r uuid; old uuid[];
begin
  if not has_perm(sid, 'MANAGE_ROLES') then raise exception 'You need the Manage Roles permission'; end if;
  ids := coalesce(ids, '{}');
  if cardinality(ids) > 10 then raise exception 'At most 10 auto roles'; end if;
  select auto_roles into old from servers where id = sid;
  -- only roles that are being added or removed are checked, so roles set by someone more senior can stay
  for r in select x from (select unnest(ids) except select unnest(old)) a(x) union select x from (select unnest(old) except select unnest(ids)) b(x) loop
    if exists (select 1 from roles where id = r and server_id = sid) and not can_use_role(sid, r) then raise exception 'You can only change roles below your own'; end if;
    if not exists (select 1 from roles where id = r and server_id = sid) and r = any(ids) then raise exception 'Unknown role'; end if;
  end loop;
  update servers set auto_roles = ids where id = sid;
  perform log_audit_sys(sid, 'changed the auto roles');
end $$;

create or replace function public.set_bot_role(sid uuid, bot text, rid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm(sid, 'MANAGE_ROLES') then raise exception 'You need the Manage Roles permission'; end if;
  if bot is null or char_length(bot) > 60 then raise exception 'Unknown bot'; end if;
  if rid is null then
    update servers set bot_roles = bot_roles - bot where id = sid;
  else
    if not can_use_role(sid, rid) then raise exception 'You can only pick roles below your own'; end if;
    update servers set bot_roles = bot_roles || jsonb_build_object(bot, rid::text) where id = sid;
  end if;
  perform log_audit_sys(sid, 'changed a bot role');
end $$;

create or replace function public.set_welcome(sid uuid, p_on boolean, p_channel uuid, p_text text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm(sid, 'MANAGE_SERVER') then raise exception 'You need the Manage Server permission'; end if;
  if char_length(coalesce(p_text, '')) > 300 then raise exception 'Welcome message is too long (300 max)'; end if;
  if p_channel is not null and not exists (select 1 from channels where id = p_channel and server_id = sid and type = 'text') then raise exception 'Pick a text channel from this server'; end if;
  update servers set welcome = jsonb_build_object('on', coalesce(p_on, false), 'channel', p_channel, 'text', coalesce(p_text, '')) where id = sid;
  perform log_audit_sys(sid, 'changed the welcome message');
end $$;

-- new members: give auto roles + post the welcome message
create or replace function public.member_joined() returns trigger
language plpgsql security definer set search_path = public as $$
declare s servers; ids uuid[]; ch uuid; t text; nm text;
begin
  select * into s from servers where id = new.server_id;
  if s.id is null then return new; end if;
  select coalesce(array_agg(r.id), '{}') into ids from roles r where r.server_id = s.id and r.id = any(s.auto_roles);
  if cardinality(ids) > 0 then
    update server_members set role_ids = (select array(select distinct unnest(role_ids || ids))) where server_id = new.server_id and user_id = new.user_id;
  end if;
  if coalesce((s.welcome->>'on')::boolean, false) then
    ch := nullif(s.welcome->>'channel', '')::uuid;
    if ch is null or not exists (select 1 from channels where id = ch and server_id = s.id) then ch := first_text_channel(s.id); end if;
    select display_name into nm from profiles where id = new.user_id;
    t := replace(replace(coalesce(nullif(s.welcome->>'text', ''), 'Welcome {user} to {server}!'), '{user}', '**' || coalesce(nm, 'a new member') || '**'), '{server}', s.name);
    if ch is not null then insert into messages (channel_id, author_id, kind, content) values (ch, new.user_id, 'sys', left(t, 500)); end if;
  end if;
  return new;
end $$;
drop trigger if exists member_joined_t on public.server_members;
create trigger member_joined_t after insert on public.server_members for each row execute function public.member_joined();

-- drag & drop ordering
create or replace function public.reorder_channels(sid uuid, items jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare it jsonb; cat uuid;
begin
  if not has_perm(sid, 'MANAGE_CHANNELS') then raise exception 'You need the Manage Channels permission'; end if;
  for it in select * from jsonb_array_elements(items) loop
    if not exists (select 1 from channels where id = (it->>'id')::uuid and server_id = sid) then raise exception 'Unknown channel'; end if;
    cat := nullif(it->>'cat', '')::uuid;
    if cat is not null and not exists (select 1 from categories where id = cat and server_id = sid) then raise exception 'Unknown category'; end if;
    update channels set position = (it->>'pos')::int, category_id = cat where id = (it->>'id')::uuid;
  end loop;
end $$;

create or replace function public.reorder_categories(sid uuid, ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare i int;
begin
  if not has_perm(sid, 'MANAGE_CHANNELS') then raise exception 'You need the Manage Channels permission'; end if;
  for i in 1..coalesce(cardinality(ids), 0) loop
    update categories set position = i - 1 where id = ids[i] and server_id = sid;
  end loop;
end $$;

-- ids = every role, top (most powerful) first. Non-owners cannot move roles at or above their own top role.
create or replace function public.reorder_roles(sid uuid, ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare myrank int := member_rank(sid, auth.uid()); locked uuid[]; i int;
begin
  if not has_perm(sid, 'MANAGE_ROLES') then raise exception 'You need the Manage Roles permission'; end if;
  if (select count(*) from roles where server_id = sid) <> coalesce(cardinality(ids), 0)
     or exists (select 1 from unnest(ids) x where not exists (select 1 from roles where id = x and server_id = sid)) then
    raise exception 'Role list is out of date - reopen settings';
  end if;
  if myrank <> -1 then
    select coalesce(array_agg(id order by position, id), '{}') into locked from roles where server_id = sid and position <= myrank;
    if ids[1:cardinality(locked)] is distinct from locked then raise exception 'You cannot move roles at or above your own'; end if;
  end if;
  for i in 1..cardinality(ids) loop update roles set position = i - 1 where id = ids[i]; end loop;
  perform log_audit_sys(sid, 'reordered roles');
end $$;

revoke execute on function public.can_use_role(uuid,uuid), public.set_auto_roles(uuid,uuid[]), public.set_bot_role(uuid,text,uuid), public.set_welcome(uuid,boolean,uuid,text),
  public.member_joined(), public.reorder_channels(uuid,jsonb), public.reorder_categories(uuid,uuid[]), public.reorder_roles(uuid,uuid[]) from public, anon;
grant execute on function public.set_auto_roles(uuid,uuid[]), public.set_bot_role(uuid,text,uuid), public.set_welcome(uuid,boolean,uuid,text),
  public.reorder_channels(uuid,jsonb), public.reorder_categories(uuid,uuid[]), public.reorder_roles(uuid,uuid[]) to authenticated;
revoke execute on function public.can_use_role(uuid,uuid), public.member_joined() from authenticated;

-- ---------- channel permissions: allow an @everyone override (target_id = the server id) ----------
alter table public.channel_overrides drop constraint if exists channel_overrides_target_type_check;
alter table public.channel_overrides add constraint channel_overrides_target_type_check check (target_type in ('role','member','everyone'));

create or replace function public.set_channel_override(cid uuid, ttype text, tid uuid, v boolean, s boolean) returns void
language plpgsql security definer set search_path = public as $$
declare sid uuid := (select server_id from channels where id = cid);
begin
  if not has_perm(sid, 'MANAGE_CHANNELS') then raise exception 'No permission'; end if;
  if ttype = 'role' and not exists (select 1 from roles where id = tid and server_id = sid) then raise exception 'Unknown role'; end if;
  if ttype = 'member' and not exists (select 1 from server_members where server_id = sid and user_id = tid) then raise exception 'Not a member of this server'; end if;
  if ttype = 'everyone' and tid <> sid then raise exception 'Bad target'; end if;
  if v is null and s is null then delete from channel_overrides where channel_id = cid and target_type = ttype and target_id = tid;
  else insert into channel_overrides values (cid, ttype, tid, v, s)
    on conflict (channel_id, target_type, target_id) do update set can_view = v, can_send = s; end if;
end $$;

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
  if r is not null then return r; end if;
  execute format('select %I from channel_overrides where channel_id=$1 and target_type=''everyone'' and target_id=$2', col) into r using cid, sid;
  return coalesce(r, true);
end $$;
revoke execute on function public.set_channel_override(uuid,text,uuid,boolean,boolean), public.chan_ok(uuid,text) from public, anon;
grant execute on function public.set_channel_override(uuid,text,uuid,boolean,boolean), public.chan_ok(uuid,text) to authenticated;
