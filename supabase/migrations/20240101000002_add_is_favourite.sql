alter table public.game_logs
  add column if not exists is_favourite boolean not null default false;
