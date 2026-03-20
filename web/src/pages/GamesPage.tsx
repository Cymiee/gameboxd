import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { IGDBGame } from "@gameboxd/lib";
import { searchGames, getTrendingGames, getGamesByFilter } from "../lib/igdb";
import GameCard from "../components/GameCard";
import Spinner from "../components/Spinner";

// ── Static filter data ───────────────────────────────────────────────────────

const GENRES: { id: number; name: string }[] = [
  { id: 2,  name: "Point-and-Click" },
  { id: 4,  name: "Fighting" },
  { id: 5,  name: "Shooter" },
  { id: 7,  name: "Music" },
  { id: 8,  name: "Platform" },
  { id: 9,  name: "Puzzle" },
  { id: 10, name: "Racing" },
  { id: 11, name: "RTS" },
  { id: 12, name: "RPG" },
  { id: 13, name: "Simulator" },
  { id: 14, name: "Sport" },
  { id: 15, name: "Strategy" },
  { id: 16, name: "TBS" },
  { id: 24, name: "Tactical" },
  { id: 25, name: "Hack & Slash" },
  { id: 26, name: "Quiz / Trivia" },
  { id: 30, name: "Pinball" },
  { id: 31, name: "Adventure" },
  { id: 32, name: "Indie" },
  { id: 33, name: "Arcade" },
  { id: 34, name: "Visual Novel" },
  { id: 35, name: "Card & Board" },
  { id: 36, name: "MOBA" },
];

const THEMES: { id: number; name: string }[] = [
  { id: 1,  name: "Action" },
  { id: 17, name: "Fantasy" },
  { id: 18, name: "Sci-Fi" },
  { id: 19, name: "Horror" },
  { id: 20, name: "Thriller" },
  { id: 21, name: "Survival" },
  { id: 22, name: "Historical" },
  { id: 23, name: "Stealth" },
  { id: 27, name: "Comedy" },
  { id: 28, name: "Business" },
  { id: 31, name: "Drama" },
  { id: 32, name: "Non-Fiction" },
  { id: 33, name: "Sandbox" },
  { id: 34, name: "Educational" },
  { id: 35, name: "Kids" },
  { id: 38, name: "Open World" },
  { id: 39, name: "Warfare" },
  { id: 40, name: "Party" },
  { id: 41, name: "4X" },
  { id: 42, name: "Erotic" },
  { id: 43, name: "Mystery" },
  { id: 44, name: "Romance" },
];

// ── FilterPill ───────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.2rem 0.6rem",
        borderRadius: 20,
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        background: active ? "rgba(108,99,255,0.14)" : "transparent",
        color: active ? "var(--accent)" : "var(--muted)",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: active ? 600 : 400,
        whiteSpace: "nowrap",
        transition: "border-color 0.12s, background 0.12s, color 0.12s",
      }}
    >
      {label}
    </button>
  );
}

// ── FilterGroup ──────────────────────────────────────────────────────────────

function FilterGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: { id: number; name: string }[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div
        style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: "0.6rem",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {items.map((item) => (
          <FilterPill
            key={item.id}
            label={item.name}
            active={selected.includes(item.id)}
            onClick={() => onToggle(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ── GamesPage ────────────────────────────────────────────────────────────────

export default function GamesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get("q") ?? "";

  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<number[]>([]);

  const [results, setResults] = useState<IGDBGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = selectedGenres.length > 0 || selectedThemes.length > 0;

  // Reset filters when search query changes
  useEffect(() => {
    setSelectedGenres([]);
    setSelectedThemes([]);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setResults([]);
    setError(null);

    let load: Promise<IGDBGame[]>;
    if (hasFilters) {
      load = getGamesByFilter(selectedGenres, selectedThemes, q || undefined);
    } else if (q) {
      load = searchGames(q);
    } else {
      load = getTrendingGames();
    }

    load
      .then((games) => { if (!cancelled) setResults(games); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, selectedGenres.join(","), selectedThemes.join(",")]);

  const toggleGenre = (id: number) =>
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );

  const toggleTheme = (id: number) =>
    setSelectedThemes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedThemes([]);
  };

  const pageTitle = q
    ? `Results for "${q}"${hasFilters ? " · filtered" : ""}`
    : hasFilters
    ? "Filtered Games"
    : "Trending Games";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>

        {/* ── Sidebar ── */}
        <div
          style={{
            width: 185,
            flexShrink: 0,
            position: "sticky",
            top: 80,
            maxHeight: "calc(100vh - 100px)",
            overflowY: "auto",
            scrollbarWidth: "none",
          }}
        >
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                display: "block",
                width: "100%",
                marginBottom: "1rem",
                padding: "0.35rem",
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--muted)",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "0.78rem",
              }}
            >
              ✕ Clear filters
            </button>
          )}

          <FilterGroup
            title="Genres"
            items={GENRES}
            selected={selectedGenres}
            onToggle={toggleGenre}
          />

          <FilterGroup
            title="Themes"
            items={THEMES}
            selected={selectedThemes}
            onToggle={toggleTheme}
          />
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
              {pageTitle}
            </h1>
            {loading && <Spinner size={18} />}
          </div>

          {error && <p style={{ color: "#f55" }}>{error}</p>}

          {!loading && !error && results.length === 0 && (
            <p style={{ color: "var(--muted)" }}>
              {hasFilters
                ? "No games found for these filters. Try removing some."
                : q
                ? `No results found for "${q}".`
                : "Nothing trending right now."}
            </p>
          )}

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
                onSelect={(g) => navigate(`/game/${g.id}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
