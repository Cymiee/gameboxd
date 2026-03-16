import { useState } from "react";
import type { IGDBGame } from "@gameboxd/lib";
import { getCoverUrl } from "@gameboxd/lib";

interface Props {
  game: IGDBGame;
  onSelect?: (game: IGDBGame) => void;
}

export default function GameCard({ game, onSelect }: Props) {
  const [hovered, setHovered] = useState(false);
  const year = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null;

  return (
    <div
      onClick={() => onSelect?.(game)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: onSelect ? "pointer" : "default",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--surface)",
        border: `1px solid ${hovered ? "var(--accent)" : "var(--border)"}`,
        transform: hovered ? "scale(1.02)" : "scale(1)",
        transition: "transform 0.15s, border-color 0.15s",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {game.cover ? (
        <img
          src={getCoverUrl(game.cover.image_id, "cover_big")}
          alt={game.name}
          style={{ width: "100%", aspectRatio: "264/374", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            aspectRatio: "264/374",
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
      <div style={{ padding: "0.5rem 0.6rem 0.6rem" }}>
        <div
          style={{
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
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>{year}</div>
        )}
      </div>
    </div>
  );
}
