import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageSpinner } from "../components/Spinner";
import type { GameLogRow, IGDBGame } from "@gameboxd/lib";
import { getUserGameLogs, deleteGameLog, getCoverUrl } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { getGames } from "../lib/igdb";

export default function WantToPlayPage() {
  const { userId } = useAuthStore();
  const [logs, setLogs] = useState<GameLogRow[]>([]);
  const [games, setGames] = useState<Map<number, IGDBGame>>(new Map());
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const allLogs = await getUserGameLogs(supabase, userId!);
        const wtpLogs = allLogs.filter((l) => l.status === "want_to_play");
        if (cancelled) return;
        setLogs(wtpLogs);

        if (wtpLogs.length > 0) {
          const ids = wtpLogs.map((l) => l.game_igdb_id);
          const gameList = await getGames(ids);
          if (cancelled) return;
          const map = new Map<number, IGDBGame>();
          gameList.forEach((g) => map.set(g.id, g));
          setGames(map);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const handleRemove = async (gameIgdbId: number) => {
    if (!userId) return;
    setRemoving(gameIgdbId);
    try {
      await deleteGameLog(supabase, userId, gameIgdbId);
      setLogs((prev) => prev.filter((l) => l.game_igdb_id !== gameIgdbId));
    } finally {
      setRemoving(null);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2.5rem 24px" }}>
      <h1
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "1.5rem",
          color: "var(--text)",
        }}
      >
        Want to Play
      </h1>

      {logs.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
          No games in your backlog yet.{" "}
          <Link to="/games" style={{ color: "var(--accent)" }}>
            Browse games
          </Link>{" "}
          and add some!
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {logs.map((log) => {
            const game = games.get(log.game_igdb_id);
            const coverUrl = game?.cover ? getCoverUrl(game.cover.image_id, "cover_small") : null;
            const year = game?.first_release_date
              ? new Date(game.first_release_date * 1000).getFullYear()
              : null;

            return (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "0.75rem 1rem",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={game?.name}
                    style={{ width: 44, height: 60, objectFit: "cover", borderRadius: 5, flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 44,
                      height: 60,
                      background: "var(--border)",
                      borderRadius: 5,
                      flexShrink: 0,
                    }}
                  />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    to={`/game/${log.game_igdb_id}`}
                    style={{
                      color: "var(--text)",
                      textDecoration: "none",
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {game?.name ?? `Game #${log.game_igdb_id}`}
                  </Link>
                  {year && (
                    <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{year}</span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  <Link
                    to={`/game/${log.game_igdb_id}`}
                    style={{
                      padding: "0.35rem 0.85rem",
                      background: "var(--accent)",
                      color: "#0e0e10",
                      borderRadius: 6,
                      textDecoration: "none",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                    }}
                  >
                    Log it
                  </Link>
                  <button
                    onClick={() => handleRemove(log.game_igdb_id)}
                    disabled={removing === log.game_igdb_id}
                    style={{
                      padding: "0.35rem 0.85rem",
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--muted)",
                      borderRadius: 6,
                      cursor: removing === log.game_igdb_id ? "not-allowed" : "pointer",
                      fontSize: "0.8rem",
                      opacity: removing === log.game_igdb_id ? 0.6 : 1,
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
