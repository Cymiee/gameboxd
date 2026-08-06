import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { SteamLibraryRow, IGDBGame } from "@gameboxd/lib";
import { getSteamLibrary } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { getGames } from "../lib/igdb";
import GameCover from "./GameCover";

const hours = (min: number) => Math.round(min / 60);

/**
 * A profile's Steam library at a glance: total games + hours, and the most-
 * played titles as covers with an hours badge. Renders nothing if empty.
 */
export default function SteamShowcase({ userId }: { userId: string }) {
  const [lib, setLib] = useState<SteamLibraryRow[]>([]);
  const [games, setGames] = useState<Map<number, IGDBGame>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getSteamLibrary(supabase, userId);
        if (cancelled) return;
        setLib(rows);
        const ids = rows.filter((r) => r.game_igdb_id != null).slice(0, 6).map((r) => r.game_igdb_id as number);
        if (ids.length) {
          const gs = await getGames(ids);
          if (!cancelled) setGames(new Map(gs.map((g) => [g.id, g])));
        }
      } catch {
        /* non-critical */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (!loaded || lib.length === 0) return null;

  const totalHours = hours(lib.reduce((s, r) => s + r.playtime_min, 0));
  const top = lib.filter((r) => r.game_igdb_id != null && r.playtime_min > 0).slice(0, 6);

  return (
    <div style={{ marginTop: "var(--space-5)" }}>
      <div className="label" style={{ marginBottom: "var(--space-3)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span>Steam</span>
        <span style={{ color: "var(--text-secondary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {lib.length} games · {totalHours.toLocaleString()}h
        </span>
      </div>

      {top.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2)" }}>
          {top.map((row) => {
            const game = games.get(row.game_igdb_id as number);
            return (
              <Link key={row.appid} to={`/game/${row.game_igdb_id}`} style={{ position: "relative", display: "block" }}>
                <GameCover name={game?.name ?? row.name} imageId={game?.cover?.image_id} size="cover_small" rounding="sm" interactive />
                <span
                  style={{
                    position: "absolute",
                    bottom: 4,
                    right: 4,
                    background: "rgba(0,0,0,0.8)",
                    color: "#fff",
                    borderRadius: "var(--radius-full)",
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    padding: "1px 6px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {hours(row.playtime_min)}h
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
