-- Bulk-import the caller's played Steam games into their logs and merge hours
-- onto existing logs. SECURITY INVOKER → RLS + auth.uid() enforce that a user
-- only touches their own rows. Emits no activity (avoids flooding the feed).
create or replace function public.import_steam_logs()
returns json
language plpgsql
security invoker
as $$
declare
  v_uid uuid := auth.uid();
  v_ins int;
  v_upd int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.game_logs (user_id, game_igdb_id, status, playtime_min)
  select sl.user_id, sl.game_igdb_id, 'played'::game_status, sl.playtime_min
  from public.steam_library sl
  where sl.user_id = v_uid
    and sl.game_igdb_id is not null
    and sl.playtime_min > 0
    and not exists (
      select 1 from public.game_logs gl
      where gl.user_id = v_uid and gl.game_igdb_id = sl.game_igdb_id
    )
  on conflict (user_id, game_igdb_id) do nothing;
  get diagnostics v_ins = row_count;

  update public.game_logs gl
  set playtime_min = sl.playtime_min, updated_at = now()
  from public.steam_library sl
  where sl.user_id = v_uid and gl.user_id = v_uid
    and sl.game_igdb_id = gl.game_igdb_id
    and sl.playtime_min > 0
    and gl.playtime_min is distinct from sl.playtime_min;
  get diagnostics v_upd = row_count;

  return json_build_object('imported', v_ins, 'updated', v_upd);
end;
$$;

grant execute on function public.import_steam_logs() to authenticated;
