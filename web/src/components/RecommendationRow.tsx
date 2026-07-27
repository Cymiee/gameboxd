import { useNavigate } from "react-router-dom";
import type { IGDBGame } from "@gameboxd/lib";
import GameCard from "./GameCard";

interface Props {
  /** The game this recommendation is based on. */
  seed: IGDBGame;
  games: IGDBGame[];
  onQuickLog?: (game: IGDBGame) => void;
}

/**
 * "Because you loved {seed}" — a recommendation row seeded by a game the user
 * rated highly, showing the seed's genres and score as the rationale.
 */
export default function RecommendationRow({ seed, games, onQuickLog }: Props) {
  const navigate = useNavigate();
  if (games.length === 0) return null;

  const genres = (seed.genres ?? []).slice(0, 3).map((g) => g.name);
  const positive = seed.total_rating != null ? Math.round(seed.total_rating) : null;

  return (
    <section style={{ marginBottom: "var(--space-7)" }}>
      <div className="reveal" style={{ marginBottom: "var(--space-4)" }}>
        <div className="label" style={{ marginBottom: 6 }}>Recommended for you</div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Because you loved <span className="grad-text">{seed.name}</span>
        </h2>

        {/* Rationale: seed genres + community score */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.4rem", marginTop: "0.6rem" }}>
          {genres.map((name) => (
            <span
              key={name}
              style={{
                padding: "2px 10px",
                borderRadius: "var(--radius-full)",
                background: "var(--bg-inset)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
          ))}
          {positive != null && (
            <span
              style={{
                padding: "2px 10px",
                borderRadius: "var(--radius-full)",
                background: "var(--status-completed-dim)",
                border: "1px solid var(--status-completed)",
                color: "var(--status-completed)",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {positive}% Positive
            </span>
          )}
        </div>
      </div>

      <div
        className="no-scrollbar stagger"
        style={{ display: "flex", gap: "var(--space-4)", overflowX: "auto", paddingBottom: "var(--space-2)", scrollSnapType: "x proximity" }}
      >
        {games.map((game) => (
          <div key={game.id} style={{ flex: "0 0 150px", minWidth: 0, scrollSnapAlign: "start" }}>
            <GameCard
              game={game}
              onSelect={() => navigate(`/game/${game.id}`)}
              {...(onQuickLog ? { onQuickLog } : {})}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
