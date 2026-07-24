-- ── user_profile_tags ────────────────────────────────────────────────────────
-- Onboarding wizard selections (avatar, genre preferences, gamer archetypes).
-- 1:1 with users. Structured as arrays so genres/archetypes can feed a future
-- recommendation engine directly.
create table public.user_profile_tags (
  user_id               uuid primary key references public.users(id) on delete cascade,
  avatar_id             text,
  genres                text[] not null default '{}',
  archetypes            text[] not null default '{}',
  onboarding_completed  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.user_profile_tags enable row level security;

-- Genres/archetypes are readable like the rest of a public profile (useful for
-- future "shared interests" / recommendation surfaces); only the owner can write.
create policy "public profile_tags read"  on public.user_profile_tags for select using (true);
create policy "own profile_tags insert"   on public.user_profile_tags for insert with check (auth.uid() = user_id);
create policy "own profile_tags update"   on public.user_profile_tags for update using (auth.uid() = user_id);

create trigger user_profile_tags_updated_at
  before update on public.user_profile_tags
  for each row execute function public.set_updated_at();
