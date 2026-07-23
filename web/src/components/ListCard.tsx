import { Link } from "react-router-dom";
import type { ListWithMeta, IGDBGame } from "@gameboxd/lib";
import GameCover from "./GameCover";

interface Props {
  list: ListWithMeta;
  /** IGDB data for this list's cover games, keyed by game id. */
  games: Map<number, IGDBGame>;
}

/** A list preview: title, game count, and up to four stacked cover thumbnails. */
export default function ListCard({ list, games }: Props) {
  const covers = list.coverGameIds;

  return (
    <Link
      to={`/list/${list.id}`}
      style={{
        display: "block",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
        textDecoration: "none",
        transition: "border-color var(--transition)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-ring)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      {/* Cover row — four fixed slots so every card is the same height */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
        {[0, 1, 2, 3].map((i) => {
          const gameId = covers[i];
          const game = gameId !== undefined ? games.get(gameId) : undefined;
          if (gameId === undefined) {
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  aspectRatio: "3 / 4",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-inset)",
                  border: "1px dashed var(--border)",
                }}
              />
            );
          }
          return (
            <div key={i} style={{ flex: 1, minWidth: 0 }}>
              <GameCover
                name={game?.name ?? "Game"}
                imageId={game?.cover?.image_id}
                size="cover_small"
                rounding="sm"
              />
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-lg)",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {list.title}
      </div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
        {list.gameCount} {list.gameCount === 1 ? "game" : "games"}
      </div>
    </Link>
  );
}
