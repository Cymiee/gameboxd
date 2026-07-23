import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { GameLogRow, IGDBGame } from "@gameboxd/lib";
import { getUserGameLogs } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { getGames } from "../lib/igdb";
import ShelfLibrary from "../components/ShelfLibrary";
import { PageSpinner } from "../components/Spinner";

/**
 * The signed-in user's working library, at a top-level route. Renders the same
 * ShelfLibrary the profile page uses — this is a destination, not a new feature.
 */
export default function ShelfPage() {
  const { userId, profile } = useAuthStore();
  const [logs, setLogs] = useState<GameLogRow[]>([]);
  const [games, setGames] = useState<Map<number, IGDBGame>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const userLogs = await getUserGameLogs(supabase, userId!);
        if (cancelled) return;
        setLogs(userLogs);

        if (userLogs.length > 0) {
          const ids = [...new Set(userLogs.map((l) => l.game_igdb_id))];
          const gameList = await getGames(ids);
          if (cancelled) return;
          const map = new Map<number, IGDBGame>();
          for (const g of gameList) map.set(g.id, g);
          setGames(map);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load your shelf");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <PageSpinner />;
  if (error) return <div style={{ padding: "2rem", color: "var(--danger)" }}>{error}</div>;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2.5rem clamp(16px, 3vw, 24px) 4rem" }}>
      <header style={{ marginBottom: "var(--space-6)" }}>
        <div className="label" style={{ marginBottom: "var(--space-2)" }}>
          {profile?.username ?? "Your library"}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-2xl)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
            color: "var(--text-primary)",
          }}
        >
          My Shelf
        </h1>
      </header>

      <ShelfLibrary
        logs={logs}
        games={games}
        emptyMessage="Nothing on your shelf yet."
      />

      {logs.length === 0 && (
        <p style={{ marginTop: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          <Link to="/explore" style={{ color: "var(--accent)" }}>Explore games</Link>{" "}
          to start building your library.
        </p>
      )}
    </div>
  );
}
