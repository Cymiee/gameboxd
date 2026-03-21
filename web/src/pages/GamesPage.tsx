import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { IGDBGame } from "@gameboxd/lib";
import { searchGames, getBrowseGames } from "../lib/igdb";
import type { SortMode } from "../lib/igdb";
import GameCard from "../components/GameCard";

// ── Static filter data ────────────────────────────────────────────────────────

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

const THEMES_ALL: { id: number; name: string }[] = [
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

const THEMES = THEMES_ALL.filter((t) => t.id !== 42);

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "trending",     label: "Trending" },
  { value: "top_rated",   label: "Top Rated" },
  { value: "new_releases", label: "New Releases" },
  { value: "az",          label: "A–Z" },
];

const SORT_TITLES: Record<SortMode, string> = {
  trending:     "Trending Games",
  top_rated:    "Top Rated Games",
  new_releases: "New Releases",
  az:           "Games A–Z",
};

const SORT_SUBTITLES: Record<SortMode, string> = {
  trending:     "What the community is playing right now",
  top_rated:    "Highest rated games of all time",
  new_releases: "The latest releases",
  az:           "Browsing all games alphabetically",
};

// ── FilterPill ────────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const bg     = active ? "#e4ff1a" : hovered ? "#18181b" : "transparent";
  const color  = active ? "#0e0e10" : hovered ? "#fafafa" : "#71717a";
  const border = active ? "1px solid #e4ff1a" : hovered ? "1px solid #3f3f46" : "1px solid #27272a";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "4px 12px",
        borderRadius: 999,
        border,
        background: bg,
        color,
        cursor: "pointer",
        fontSize: 13,
        fontFamily: "Inter, sans-serif",
        whiteSpace: "nowrap",
        lineHeight: 1.5,
        transition: "border-color 0.12s, background 0.12s, color 0.12s",
      }}
    >
      {label}
    </button>
  );
}

// ── SidebarLabel ──────────────────────────────────────────────────────────────

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontFamily: "Syne, sans-serif",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "#71717a",
        marginBottom: "0.6rem",
      }}
    >
      {children}
    </div>
  );
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "150%",
          borderRadius: 8,
          background: "#18181b",
          animation: "skeletonPulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: 14,
          borderRadius: 4,
          background: "#18181b",
          marginTop: "0.5rem",
          width: "70%",
          animation: "skeletonPulse 1.5s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ── GamesPage ─────────────────────────────────────────────────────────────────

export default function GamesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get("q") ?? "";

  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<number | null>(null);
  const [sort, setSort] = useState<SortMode>("trending");
  const [results, setResults] = useState<IGDBGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = selectedGenre !== null || selectedTheme !== null;

  // Reset filters when search query changes
  useEffect(() => {
    setSelectedGenre(null);
    setSelectedTheme(null);
  }, [q]);

  // Fetch games
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setResults([]);
    setError(null);

    // Pure text search (no genre/theme) uses name-match search
    let load: Promise<IGDBGame[]>;
    if (q && !hasFilters) {
      load = searchGames(q);
    } else {
      const opts: { sort: SortMode; genreId?: number; themeId?: number; query?: string } = { sort };
      if (selectedGenre !== null) opts.genreId = selectedGenre;
      if (selectedTheme !== null) opts.themeId = selectedTheme;
      if (q) opts.query = q;
      load = getBrowseGames(opts);
    }

    load
      .then((games) => { if (!cancelled) setResults(games); })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load games");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [q, selectedGenre, selectedTheme, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGenre = (id: number) =>
    setSelectedGenre((prev) => (prev === id ? null : id));

  const toggleTheme = (id: number) =>
    setSelectedTheme((prev) => (prev === id ? null : id));

  const clearFilters = () => {
    setSelectedGenre(null);
    setSelectedTheme(null);
  };

  // Dynamic heading
  const activeGenre = GENRES.find((g) => g.id === selectedGenre);
  const activeTheme = THEMES.find((t) => t.id === selectedTheme);
  const headingParts = [activeGenre?.name, activeTheme?.name].filter(Boolean);

  const pageTitle = q
    ? `Results for "${q}"`
    : headingParts.length > 0
    ? headingParts.join(" ") + " Games"
    : SORT_TITLES[sort];

  const subtitle = q
    ? undefined
    : headingParts.length > 0
    ? `Browsing ${headingParts.join(" · ")}`
    : SORT_SUBTITLES[sort];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2rem 24px" }}>
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 0.65; }
        }
      `}</style>

      <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
        {/* ── Sidebar ── */}
        <div
          style={{
            width: 200,
            flexShrink: 0,
            position: "sticky",
            top: 24,
            maxHeight: "calc(100vh - 48px)",
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
                border: "1px solid #27272a",
                color: "#71717a",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "Inter, sans-serif",
                transition: "border-color 0.12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#e4ff1a")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#27272a")}
            >
              ✕ Clear filters
            </button>
          )}

          {/* Genres */}
          <div style={{ marginBottom: "1.25rem" }}>
            <SidebarLabel>Genres</SidebarLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {GENRES.map((g) => (
                <FilterPill
                  key={g.id}
                  label={g.name}
                  active={selectedGenre === g.id}
                  onClick={() => toggleGenre(g.id)}
                />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#27272a", marginBottom: "1.25rem" }} />

          {/* Themes */}
          <div style={{ marginBottom: "1.5rem" }}>
            <SidebarLabel>Themes</SidebarLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {THEMES.map((t) => (
                <FilterPill
                  key={t.id}
                  label={t.name}
                  active={selectedTheme === t.id}
                  onClick={() => toggleTheme(t.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Heading */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h1
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 28,
                fontWeight: 700,
                margin: 0,
                color: "var(--text)",
              }}
            >
              {pageTitle}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  color: "var(--muted)",
                  margin: "0.35rem 0 0",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* Sort bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {SORT_OPTIONS.map((opt) => (
                <FilterPill
                  key={opt.value}
                  label={opt.label}
                  active={sort === opt.value}
                  onClick={() => setSort(opt.value)}
                />
              ))}
            </div>
            {!loading && results.length > 0 && (
              <span
                style={{
                  fontSize: 13,
                  color: "#71717a",
                  fontFamily: "Inter, sans-serif",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Showing {results.length} games
              </span>
            )}
          </div>

          {error && (
            <p style={{ color: "var(--danger)", fontFamily: "Inter, sans-serif" }}>{error}</p>
          )}

          {/* Grid — skeleton / empty / results */}
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 24,
              }}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : !error && results.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "5rem 2rem",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                No games found
              </p>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  color: "var(--muted)",
                  marginTop: "0.5rem",
                }}
              >
                Try a different genre or theme
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 24,
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
      </div>
    </div>
  );
}
