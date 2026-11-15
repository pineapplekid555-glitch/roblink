-- Run once (safe to re-run). Makes the Server Booster badge permanent: set on first boost, never reset.
alter table public.profiles add column if not exists ever_boosted boolean not null default false;
update public.profiles set ever_boosted = true where id in (select user_id from public.boosts);
create or replace function public.mark_booster() returns trigger language plpgsql security definer set search_path = public as $$
begin update profiles set ever_boosted = true where id = new.user_id and not ever_boosted; return new; end $$;
drop trigger if exists trg_mark_booster on public.boosts;
create trigger trg_mark_booster after insert on public.boosts for each row execute function public.mark_booster();
