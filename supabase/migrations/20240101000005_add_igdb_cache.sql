-- ── igdb_cache ────────────────────────────────────────────────────────────────
-- Shared cache for the igdb-proxy edge function.
--
-- Edge function isolates do not reliably persist module-level state between
-- requests, so the previous in-memory token cache never hit: every proxied
-- request re-fetched a Twitch OAuth token (~1.4s) before calling IGDB (~1.0s).
-- This table gives the function a cache that survives isolate recycling.
--
-- Holds two kinds of entry:
--   'twitch_token'  — the OAuth access token, refreshed shortly before expiry
--   'q:<sha256>'    — a proxied IGDB response, keyed by endpoint + query body

create table public.igdb_cache (
  key        text primary key,
  value      jsonb not null,
  expires_at timestamptz not null
);

create index igdb_cache_expires_at_idx on public.igdb_cache (expires_at);

-- Server-side only. RLS is on with no policies, so the anon/authenticated keys
-- can never read or write it; the edge function uses the service role, which
-- bypasses RLS.
alter table public.igdb_cache enable row level security;

-- Opportunistic cleanup so the table cannot grow without bound. Called by the
-- edge function on a small fraction of requests; no scheduler required.
create or replace function public.prune_igdb_cache()
returns void language sql security definer set search_path = public as $$
  delete from public.igdb_cache where expires_at < now();
$$;
