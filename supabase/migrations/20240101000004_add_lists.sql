-- ── lists ─────────────────────────────────────────────────────────────────────
create table public.lists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  title        text not null,
  description  text,
  likes        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index lists_user_id_idx  on public.lists (user_id);
create index lists_likes_idx    on public.lists (likes desc);

alter table public.lists enable row level security;

create policy "public lists read"  on public.lists for select using (true);
create policy "own lists insert"   on public.lists for insert with check (auth.uid() = user_id);
create policy "own lists update"   on public.lists for update using (auth.uid() = user_id);
create policy "own lists delete"   on public.lists for delete using (auth.uid() = user_id);

create trigger lists_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

-- ── list_games ─────────────────────────────────────────────────────────────────
create table public.list_games (
  id            uuid primary key default gen_random_uuid(),
  list_id       uuid not null references public.lists(id) on delete cascade,
  game_igdb_id  integer not null,
  position      integer not null,
  created_at    timestamptz not null default now(),
  unique (list_id, game_igdb_id),
  unique (list_id, position)
);

create index list_games_list_id_idx on public.list_games (list_id);

alter table public.list_games enable row level security;

create policy "public list_games read"  on public.list_games for select using (true);
create policy "list owner insert"       on public.list_games for insert
  with check (
    auth.uid() = (select user_id from public.lists where id = list_id)
  );
create policy "list owner delete"       on public.list_games for delete
  using (
    auth.uid() = (select user_id from public.lists where id = list_id)
  );
