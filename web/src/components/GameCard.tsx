import { useState } from "react";
import type { IGDBGame } from "@gameboxd/lib";
import { getCoverUrl } from "@gameboxd/lib";

interface Props {
  game: IGDBGame;
  onSelect?: (game: IGDBGame) => void;
  onQuickLog?: (game: IGDBGame) => void;
}

export default function GameCard({ game, onSelect, onQuickLog }: Props) {
  const [hovered, setHovered] = useState(false);
  const year = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null;

  return (
    <div style={{ cursor: onSelect ? "pointer" : "default" }}>
      <div
        onClick={() => onSelect?.(game)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          aspectRatio: "2/3",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--surface)",
          transform: hovered ? "scale(1.03)" : "scale(1)",
          transition: "transform 0.18s ease",
        }}
      >
        {game.cover ? (
          <img
            src={getCoverUrl(game.cover.image_id, "cover_big")}
            alt={game.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              fontSize: "0.8rem",
            }}
          >
            No cover
          </div>
        )}

        {hovered && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {onQuickLog && (
              <button
                onClick={(e) => { e.stopPropagation(); onQuickLog(game); }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  border: "none",
                  color: "#0e0e10",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                +
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ paddingTop: "0.5rem" }}>
        <div
          style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 600,
            fontSize: "0.85rem",
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {game.name}
        </div>
        {year && (
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 1 }}>
            {year}
          </div>
        )}
      </div>
    </div>
  );
}
