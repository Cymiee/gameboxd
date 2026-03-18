import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { IGDBGame } from "@gameboxd/lib";
import { searchGames, getTrendingGames } from "../lib/igdb";
import GameCard from "../components/GameCard";

export default function GamesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get("q") ?? "";

  const [results, setResults] = useState<IGDBGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = q
      ? searchGames(q)
      : getTrendingGames();

    load
      .then((games) => { if (!cancelled) setResults(games); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [q]);

  return (
    <div style={{ padding: "2rem", maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1.5rem", fontSize: "1.3rem", fontWeight: 700 }}>
        {q ? `Results for "${q}"` : "Trending Games"}
      </h1>

      {loading && <p style={{ color: "var(--muted)" }}>Loading...</p>}
      {error && <p style={{ color: "#f55" }}>{error}</p>}

      {!loading && !error && results.length === 0 && (
        <p style={{ color: "var(--muted)" }}>
          {q ? `No results found for "${q}".` : "Nothing trending right now."}
        </p>
      )}

      {results.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "1rem",
          }}
        >
          {results.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onSelect={(g) => navigate(`/game/${g.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
