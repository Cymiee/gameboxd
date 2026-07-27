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
            className="reveal"
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.15))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animationDuration: "220ms",
            }}
          >
            <button
              className="reveal-pop press"
              onClick={(e) => {
                e.stopPropagation();
                onQuickLog(game);
              }}
              aria-label={`Log ${game.name}`}
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "var(--grad-brand)",
                border: "none",
                color: color.onAccent,
                fontSize: "1.6rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                flexShrink: 0,
                boxShadow: "var(--glow-accent)",
              }}
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
