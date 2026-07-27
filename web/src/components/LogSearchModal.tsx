import { useEffect, useState } from "react";
import type { IGDBGame } from "@gameboxd/lib";
import { searchGames } from "../lib/igdb";
import { useGamesStore } from "../store/games";
import GameCover from "./GameCover";
import Spinner from "./Spinner";
import LogGameModal from "./LogGameModal";
import { SearchIcon } from "./icons";

/**
 * Global "+ LOG" entry point: search for a game, pick it, then log it.
 * Reuses LogGameModal for the actual logging step.
 */
export default function LogSearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IGDBGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<IGDBGame | null>(null);
  const logGame = useGamesStore((s) => s.logGame);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(() => {
      searchGames(q).then(setResults).catch(() => setResults([])).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Escape closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Once a game is picked, hand off to the full log modal.
  if (selected) {
    return (
      <LogGameModal
        game={selected}
        onClose={() => setSelected(null)}
        onSave={async (status, rating, review) => {
          await logGame(
            selected.id,
            status,
            rating ?? undefined,
            review ?? undefined,
            (selected.genres ?? []).map((g) => g.id),
          );
          onClose();
        }}
      />
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "1rem",
        paddingTop: "10vh",
        zIndex: 300,
      }}
    >
      <div
        className="reveal-pop"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.25rem",
          width: "min(560px, 100%)",
          maxHeight: "80dvh",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          boxShadow: "var(--shadow-modal)",
          animationDuration: "220ms",
        }}
      >
        <label className="label" style={{ display: "block" }}>Log a game</label>

        {/* Search field */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.7rem 0.95rem",
            background: "var(--bg-inset)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-full)",
          }}
        >
          <SearchIcon size={18} color="var(--text-muted)" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a game to log..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "var(--text-base)",
              fontFamily: "var(--font-body)",
            }}
          />
          {loading && <Spinner size={16} thickness={2} />}
        </div>

        {/* Results */}
        <div className="no-scrollbar" style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {query.trim().length >= 2 && !loading && results.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", padding: "0.5rem 0.25rem" }}>
              No games found for "{query.trim()}".
            </p>
          )}
          {results.map((game) => {
            const year = game.first_release_date
              ? new Date(game.first_release_date * 1000).getFullYear()
              : null;
            return (
              <button
                key={game.id}
                onClick={() => setSelected(game)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.4rem",
                  background: "none",
                  border: "1px solid transparent",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background var(--transition), border-color var(--transition)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-inset)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "transparent"; }}
              >
                <div style={{ width: 38, flexShrink: 0 }}>
                  <GameCover name={game.name} imageId={game.cover?.image_id} size="thumb" rounding="sm" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {game.name}
                  </div>
                  {year && (
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{year}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
