import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { IGDBGame } from "@gameboxd/lib";
import { searchGames, getBrowseGames } from "../lib/igdb";
import type { SortMode } from "../lib/igdb";
import GameCard from "../components/GameCard";
import { useIsMobile } from "../hooks/useIsMobile";

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
  { value: "trending",      label: "Trending" },
  { value: "top_rated",    label: "Top Rated" },
  { value: "new_releases", label: "New Releases" },
];

const SORT_TITLES: Record<SortMode, string> = {
  trending:     "Trending Games",
  top_rated:    "Top Rated Games",
  new_releases: "New Releases",
};

const SORT_SUBTITLES: Record<SortMode, string> = {
  trending:     "What the community is playing right now",
  top_rated:    "Highest rated games of all time",
  new_releases: "The latest releases",
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

  const bg     = active ? "var(--accent)" : hovered ? "var(--bg-card)" : "transparent";
  const color  = active ? "var(--on-accent)" : hovered ? "var(--text-primary)" : "var(--text-muted)";
  const border = active ? "1px solid var(--accent)" : hovered ? "1px solid var(--border-strong)" : "1px solid var(--border)";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "4px 12px",
        borderRadius: "var(--radius-full)",
        border,
        background: bg,
        color,
        cursor: "pointer",
        fontSize: 13,
        fontFamily: "var(--font-body)",
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
    <div className="label" style={{ marginBottom: "var(--space-3)" }}>
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
          width: "100%",
          aspectRatio: "3 / 4",
          borderRadius: "var(--radius-lg)",
          background: "var(--bg-card)",
          animation: "skeletonPulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: 14,
          borderRadius: 4,
          background: "var(--bg-card)",
          marginTop: "var(--space-3)",
          width: "70%",
          animation: "skeletonPulse 1.5s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ── ExplorePage ─────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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

  // Mobile: filters become horizontally-scrollable rows above the results
  const pillRowStyle: React.CSSProperties = isMobile
    ? { display: "flex", gap: "0.35rem", overflowX: "auto", paddingBottom: "0.35rem", scrollbarWidth: "none" }
    : { display: "flex", flexWrap: "wrap", gap: "0.35rem" };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "repeat(3, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
    gap: isMobile ? 12 : 24,
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "1.25rem 16px" : "2rem 24px" }}>

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "1.25rem" : "2rem",
          alignItems: isMobile ? "stretch" : "flex-start",
        }}
      >
        {/* ── Sidebar (filter rows on mobile) ── */}
        <div
          style={
            isMobile
              ? { width: "100%" }
              : {
                  width: 200,
                  flexShrink: 0,
                  position: "sticky",
                  top: 24,
                  maxHeight: "calc(100vh - 48px)",
                  overflowY: "auto",
                  scrollbarWidth: "none",
                }
          }
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
                color: "var(--text-muted)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "var(--font-body)",
                transition: "border-color 0.12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              ✕ Clear filters
            </button>
          )}

          {/* Genres */}
          <div style={{ marginBottom: isMobile ? "0.75rem" : "1.25rem" }}>
            <SidebarLabel>Genres</SidebarLabel>
            <div style={pillRowStyle}>
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
          {!isMobile && <div style={{ height: 1, background: "var(--border)", marginBottom: "1.25rem" }} />}

          {/* Themes */}
          <div style={{ marginBottom: isMobile ? 0 : "1.5rem" }}>
            <SidebarLabel>Themes</SidebarLabel>
            <div style={pillRowStyle}>
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
          {/* Heading — "Explore" is the page identity; the h1 stays contextual */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div className="label" style={{ marginBottom: "var(--space-2)" }}>Explore</div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-2xl)",
                fontWeight: 600,
                letterSpacing: "-0.015em",
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              {pageTitle}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                  margin: "var(--space-2) 0 0",
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
              flexWrap: "wrap",
              marginBottom: "1.5rem",
              gap: "0.75rem 1rem",
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
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-body)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Showing {results.length} games
              </span>
            )}
          </div>

          {error && (
            <p style={{ color: "var(--danger)", fontFamily: "var(--font-body)" }}>{error}</p>
          )}

          {/* Grid — skeleton / empty / results */}
          {loading ? (
            <div style={gridStyle}>
              {Array.from({ length: isMobile ? 6 : 4 }).map((_, i) => (
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
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-xl)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                No games found
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  color: "var(--text-muted)",
                  marginTop: "0.5rem",
                }}
              >
                Try a different genre or theme
              </p>
            </div>
          ) : (
            <div style={gridStyle}>
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
