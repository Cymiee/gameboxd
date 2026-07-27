-- Steam account linking (Phase 1). steam_id is steamID64; written only by the
-- steam-auth edge function after verifying the OpenID response.
alter table public.users
  add column if not exists steam_id text unique,
  add column if not exists steam_synced_at timestamptz;
