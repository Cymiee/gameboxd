import { useState } from "react";
import type { IGDBGame } from "@gameboxd/lib";
import GameCover from "./GameCover";
import { color, font, space, transition } from "../theme";

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
    <div
      style={{ width: "100%" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <GameCover
        name={game.name}
        imageId={game.cover?.image_id}
        interactive
        {...(onSelect ? { onClick: () => onSelect(game) } : {})}
      >
        {onQuickLog && hovered && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.15))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickLog(game);
              }}
              aria-label={`Log ${game.name}`}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: color.accent,
                border: "none",
                color: color.onAccent,
                fontSize: "1.5rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                flexShrink: 0,
                transition: `background ${transition}`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = color.accentHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = color.accent)}
            >
              +
            </button>
          </div>
        )}
      </GameCover>

      <div style={{ paddingTop: space[3] }}>
        <div
          style={{
            fontFamily: font.display,
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            lineHeight: 1.35,
            color: hovered ? color.accent : color.text,
            transition: `color ${transition}`,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {game.name}
        </div>
        {year && (
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: color.textMuted,
              marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {year}
          </div>
        )}
      </div>
    </div>
  );
}
