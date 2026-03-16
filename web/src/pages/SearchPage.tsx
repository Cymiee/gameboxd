import { useState } from "react";
import type { IGDBGame, GameLogRow } from "@gameboxd/lib";
import { getCoverUrl } from "@gameboxd/lib";
import { searchGames } from "../lib/igdb";
import { useGamesStore } from "../store/games";
import GameCard from "../components/GameCard";
import LogGameModal from "../components/LogGameModal";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IGDBGame[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<IGDBGame | null>(null);
  const [loggingGame, setLoggingGame] = useState<IGDBGame | null>(null);

  const { logs, logGame } = useGamesStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSelectedGame(null);
    try {
      const games = await searchGames(query.trim());
      setResults(games);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const existingLog = loggingGame
    ? logs.find((l) => l.game_igdb_id === loggingGame.id)
    : undefined;

  const handleSaveLog = async (
    status: GameLogRow["status"],
    rating?: number | null,
    review?: string | null
  ) => {
    if (!loggingGame) return;
    await logGame(loggingGame.id, status, rating, review);
  };

  const year = (ts: number | null) =>
    ts ? new Date(ts * 1000).getFullYear() : null;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 57px)", overflow: "hidden" }}>
      {/* Left panel */}
      <div
        style={{
          flex: selectedGame ? "0 0 55%" : "1",
          overflowY: "auto",
          padding: "2rem",
          transition: "flex 0.2s",
        }}
      >
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games..."
            style={{
              flex: 1,
              padding: "0.6rem 0.9rem",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: 8,
              fontSize: "0.95rem",
            }}
          />
          <button
            type="submit"
            disabled={searching}
            style={{
              padding: "0.6rem 1.25rem",
              background: "var(--accent)",
              border: "none",
              color: "#fff",
              borderRadius: 8,
              cursor: searching ? "not-allowed" : "pointer",
              fontWeight: 600,
              opacity: searching ? 0.7 : 1,
            }}
          >
            {searching ? "..." : "Search"}
          </button>
        </form>

        {searchError && (
          <p style={{ color: "#f55", marginBottom: "1rem" }}>{searchError}</p>
        )}

        {results.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: "1rem",
            }}
          >
            {results.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onSelect={setSelectedGame}
              />
            ))}
          </div>
        )}

        {!searching && results.length === 0 && query && (
          <p style={{ color: "var(--muted)" }}>No results found.</p>
        )}
      </div>

      {/* Right detail panel */}
      {selectedGame && (
        <div
          style={{
            flex: "0 0 45%",
            borderLeft: "1px solid var(--border)",
            overflowY: "auto",
            padding: "2rem",
            background: "var(--surface)",
          }}
        >
          <button
            onClick={() => setSelectedGame(null)}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "1.2rem",
              marginBottom: "1rem",
              padding: 0,
            }}
          >
            ✕
          </button>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem" }}>
            {selectedGame.cover && (
              <img
                src={getCoverUrl(selectedGame.cover.image_id, "cover_big")}
                alt={selectedGame.name}
                style={{ width: 110, borderRadius: 6, flexShrink: 0, alignSelf: "flex-start" }}
              />
            )}
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, lineHeight: 1.3 }}>
                {selectedGame.name}
              </h2>
              {year(selectedGame.first_release_date) && (
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 4 }}>
                  {year(selectedGame.first_release_date)}
                </p>
              )}
              {selectedGame.rating != null && (
                <p style={{ color: "var(--accent)", fontSize: "0.85rem", marginTop: 4 }}>
                  ★ {selectedGame.rating.toFixed(1)} / 100
                  {selectedGame.rating_count != null && (
                    <span style={{ color: "var(--muted)" }}> ({selectedGame.rating_count} ratings)</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {selectedGame.genres && selectedGame.genres.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
              {selectedGame.genres.map((g) => (
                <span
                  key={g.id}
                  style={{
                    padding: "0.2rem 0.6rem",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 20,
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                  }}
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {selectedGame.summary && (
            <p style={{ fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              {selectedGame.summary}
            </p>
          )}

          {selectedGame.platforms && selectedGame.platforms.length > 0 && (
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1.25rem" }}>
              {selectedGame.platforms.map((p) => p.name).join(" · ")}
            </p>
          )}

          <button
            onClick={() => setLoggingGame(selectedGame)}
            style={{
              width: "100%",
              padding: "0.65rem",
              background: "var(--accent)",
              border: "none",
              color: "#fff",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.95rem",
            }}
          >
            {logs.find((l) => l.game_igdb_id === selectedGame.id)
              ? "Update Log"
              : "Log This Game"}
          </button>
        </div>
      )}

      {loggingGame && (
        <LogGameModal
          game={loggingGame}
          {...(existingLog ? { existingLog } : {})}
          onClose={() => setLoggingGame(null)}
          onSave={handleSaveLog}
        />
      )}
    </div>
  );
}
