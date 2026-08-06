-- "played" status: engaged with a game (e.g. imported from Steam with hours)
-- without necessarily finishing it. playtime_min holds hours merged from Steam.
alter type game_status add value if not exists 'played';

alter table public.game_logs
  add column if not exists playtime_min integer;
