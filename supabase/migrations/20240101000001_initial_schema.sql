-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── users ─────────────────────────────────────────────────────────────────────
-- Mirrors auth.users (1:1). Row is inserted on signup via the app.
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  bio         text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.users enable row level security;

-- Users can read any profile, but only write their own
create policy "public profile read"  on public.users for select using (true);
create policy "own profile insert"   on public.users for insert with check (auth.uid() = id);
create policy "own profile update"   on public.users for update using (auth.uid() = id);

-- ── top_games ─────────────────────────────────────────────────────────────────
create table public.top_games (
  user_id       uuid not null references public.users(id) on delete cascade,
  game_igdb_id  integer not null,
  position      smallint not null check (position between 1 and 3),
  primary key (user_id, position)
);

alter table public.top_games enable row level security;

create policy "public top_games read" on public.top_games for select using (true);
create policy "own top_games write"   on public.top_games for insert with check (auth.uid() = user_id);
create policy "own top_games update"  on public.top_games for update using (auth.uid() = user_id);
create policy "own top_games delete"  on public.top_games for delete using (auth.uid() = user_id);

-- ── game_logs ─────────────────────────────────────────────────────────────────
create type game_status as enum ('playing', 'completed', 'dropped', 'want_to_play');

create table public.game_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.users(id) on delete cascade,
  game_igdb_id  integer not null,
  status        game_status not null,
  rating        smallint check (rating between 1 and 10),
  review        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, game_igdb_id)
);

create index game_logs_user_id_idx on public.game_logs (user_id);

alter table public.game_logs enable row level security;

create policy "public game_logs read" on public.game_logs for select using (true);
create policy "own game_logs insert"  on public.game_logs for insert with check (auth.uid() = user_id);
create policy "own game_logs update"  on public.game_logs for update using (auth.uid() = user_id);
create policy "own game_logs delete"  on public.game_logs for delete using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger game_logs_updated_at
  before update on public.game_logs
  for each row execute function public.set_updated_at();

-- ── friendships ───────────────────────────────────────────────────────────────
create type friendship_status as enum ('pending', 'accepted');

create table public.friendships (
  id            uuid primary key default uuid_generate_v4(),
  requester_id  uuid not null references public.users(id) on delete cascade,
  addressee_id  uuid not null references public.users(id) on delete cascade,
  status        friendship_status not null default 'pending',
  created_at    timestamptz not null default now(),
  -- prevent duplicate or self-referential friendships
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create index friendships_addressee_idx  on public.friendships (addressee_id);
create index friendships_requester_idx  on public.friendships (requester_id);

alter table public.friendships enable row level security;

-- Either party can see their friendships
create policy "parties can read friendship"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Only requester can initiate
create policy "requester can insert"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

-- Only addressee can accept
create policy "addressee can update"
  on public.friendships for update
  using (auth.uid() = addressee_id);

-- Either party can delete (unfriend / cancel request)
create policy "parties can delete"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ── activity ──────────────────────────────────────────────────────────────────
create type activity_type as enum ('logged', 'rated', 'reviewed', 'topped');

create table public.activity (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.users(id) on delete cascade,
  type          activity_type not null,
  game_igdb_id  integer not null,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index activity_user_id_idx    on public.activity (user_id);
create index activity_created_at_idx on public.activity (created_at desc);

alter table public.activity enable row level security;

-- Activity is public-readable (friends feed shown to all friends)
create policy "public activity read" on public.activity for select using (true);
create policy "own activity insert"  on public.activity for insert with check (auth.uid() = user_id);
-- Activity rows are immutable after insert — no update/delete policies
