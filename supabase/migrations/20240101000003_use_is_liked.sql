-- Handles all states: rename if is_favourite exists, add if neither exists, no-op if is_liked already exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'game_logs' and column_name = 'is_favourite'
  ) then
    alter table public.game_logs rename column is_favourite to is_liked;
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'game_logs' and column_name = 'is_liked'
  ) then
    alter table public.game_logs add column is_liked boolean not null default false;
  end if;
end $$;
