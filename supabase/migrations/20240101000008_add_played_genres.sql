-- Genres accumulated automatically from highly-rated logs (distinct from the
-- user-curated onboarding `genres`). Both feed game recommendations.
alter table public.user_profile_tags
  add column if not exists played_genres text[] not null default '{}';
