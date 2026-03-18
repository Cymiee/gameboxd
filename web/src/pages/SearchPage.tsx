import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { IGDBGame } from "@gameboxd/lib";
import { searchGames } from "../lib/igdb";
import GameCard from "../components/GameCard";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IGDBGame[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const games = await searchGames(query.trim());
      setResults(games);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 960, margin: "0 auto" }}>
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.75rem", marginBottom: "1.75rem" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games..."
          style={{
            flex: 1,
            padding: "0.65rem 1rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            borderRadius: 8,
            fontSize: "1rem",
          }}
        />
        <button
          type="submit"
          disabled={searching}
          style={{
            padding: "0.65rem 1.5rem",
            background: "var(--accent)",
            border: "none",
            color: "#fff",
            borderRadius: 8,
            cursor: searching ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "1rem",
            opacity: searching ? 0.7 : 1,
          }}
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {searchError && <p style={{ color: "#f55", marginBottom: "1rem" }}>{searchError}</p>}

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

      {!searching && results.length === 0 && query && (
        <p style={{ color: "var(--muted)" }}>No results found.</p>
      )}
    </div>
  );
}
