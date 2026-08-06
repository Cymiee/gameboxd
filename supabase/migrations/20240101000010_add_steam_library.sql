-- A user's imported Steam library (owned games + playtime). Source of truth for
-- hours and the Backlog. Written only by the steam-sync edge function via the
-- service role. game_igdb_id is null when we couldn't match the Steam appid.
create table public.steam_library (
  user_id       uuid not null references public.users(id) on delete cascade,
  appid         integer not null,
  name          text not null,
  playtime_min  integer not null default 0,
  playtime_2wk  integer not null default 0,
  game_igdb_id  integer,
  primary key (user_id, appid)
);

create index steam_library_user_idx on public.steam_library (user_id);
create index steam_library_igdb_idx on public.steam_library (game_igdb_id);

alter table public.steam_library enable row level security;

-- Public read (like the rest of a profile); writes happen only in the
-- steam-sync edge function via the service role, which bypasses RLS.
create policy "public steam_library read" on public.steam_library for select using (true);
