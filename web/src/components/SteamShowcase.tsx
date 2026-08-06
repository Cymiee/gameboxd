import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { SteamLibraryRow, IGDBGame } from "@gameboxd/lib";
import { getSteamLibrary } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { getGames } from "../lib/igdb";
import { formatPlaytime } from "../lib/format";
import GameCover from "./GameCover";

const TOP_N = 6;

/**
 * A profile's Steam library at a glance: total games + hours, the most-played
 * titles (with hours), and the Backlog (owned but never played). Renders
 * nothing if empty.
 */
export default function SteamShowcase({ userId }: { userId: string }) {
  const [lib, setLib] = useState<SteamLibraryRow[]>([]);
  const [games, setGames] = useState<Map<number, IGDBGame>>(new Map());
  const [loaded, setLoaded] = useState(false);

  const played = lib.filter((r) => r.game_igdb_id != null && r.playtime_min > 0).slice(0, TOP_N);
  const backlogAll = lib.filter((r) => r.playtime_min === 0);
  const backlog = backlogAll.filter((r) => r.game_igdb_id != null).slice(0, TOP_N);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getSteamLibrary(supabase, userId);
        if (cancelled) return;
        setLib(rows);
        const ids = [
          ...rows.filter((r) => r.game_igdb_id != null && r.playtime_min > 0).slice(0, TOP_N),
          ...rows.filter((r) => r.game_igdb_id != null && r.playtime_min === 0).slice(0, TOP_N),
        ].map((r) => r.game_igdb_id as number);
        if (ids.length) {
          const gs = await getGames([...new Set(ids)]);
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

  const totalMin = lib.reduce((s, r) => s + r.playtime_min, 0);

  const grid = (rows: SteamLibraryRow[], withHours: boolean) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2)" }}>
      {rows.map((row) => {
        const game = games.get(row.game_igdb_id as number);
        return (
          <Link key={row.appid} to={`/game/${row.game_igdb_id}`} style={{ position: "relative", display: "block" }}>
            <GameCover name={game?.name ?? row.name} imageId={game?.cover?.image_id} size="cover_small" rounding="sm" interactive />
            {withHours && (
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
                {formatPlaytime(row.playtime_min)}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div style={{ marginTop: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className="label" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span>Steam</span>
        <span style={{ color: "var(--text-secondary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {lib.length} games · {formatPlaytime(totalMin)}
        </span>
      </div>

      {played.length > 0 && (
        <div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "0 0 var(--space-2)" }}>Most played</p>
          {grid(played, true)}
        </div>
      )}

      {backlog.length > 0 && (
        <div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "0 0 var(--space-2)" }}>
            Backlog · {backlogAll.length} unplayed
          </p>
          {grid(backlog, false)}
        </div>
      )}
    </div>
  );
}
