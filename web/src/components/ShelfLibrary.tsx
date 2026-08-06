import { useNavigate } from "react-router-dom";
import type { GameLogRow, IGDBGame } from "@gameboxd/lib";
import Shelf from "./Shelf";
import GameCover from "./GameCover";
import { STATUS_META, STATUS_ORDER } from "../theme";
import { formatPlaytime } from "../lib/format";

interface Props {
  logs: GameLogRow[];
  /** IGDB data keyed by game id — callers already fetch this for their own use. */
  games: Map<number, IGDBGame>;
  emptyMessage?: string;
}

/**
 * A user's library rendered as status shelves. Shared by the profile page and
 * the standalone /shelf route so both surfaces stay identical.
 */
export default function ShelfLibrary({ logs, games, emptyMessage = "No games logged yet." }: Props) {
  const navigate = useNavigate();

  if (logs.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>{emptyMessage}</p>;
  }

  const renderCovers = (shelfLogs: GameLogRow[]) =>
    shelfLogs.map((log) => {
      const game = games.get(log.game_igdb_id);
      if (!game) return null;
      return (
        <GameCover
          key={log.id}
          name={game.name}
          imageId={game.cover?.image_id}
          rounding="md"
          interactive
          onClick={() => navigate(`/game/${log.game_igdb_id}`)}
        >
          {log.rating != null && (
            <span
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                background: "rgba(0,0,0,0.78)",
                color: "var(--accent)",
                border: "1px solid var(--accent-ring)",
                borderRadius: "var(--radius-full)",
                fontSize: "0.6875rem",
                fontWeight: 600,
                padding: "1px 7px",
                lineHeight: 1.5,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {log.rating}
            </span>
          )}
          {log.playtime_min != null && log.playtime_min > 0 && (
            <span
              style={{
                position: "absolute",
                bottom: 6,
                left: 6,
                background: "rgba(0,0,0,0.78)",
                color: "#fff",
                borderRadius: "var(--radius-full)",
                fontSize: "0.625rem",
                fontWeight: 700,
                padding: "1px 6px",
                lineHeight: 1.5,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatPlaytime(log.playtime_min)}
            </span>
          )}
        </GameCover>
      );
    });

  return (
    <>
      {STATUS_ORDER.map((status) => {
        const shelfLogs = logs
          .filter((l) => l.status === status)
          .sort((a, b) => (b.playtime_min ?? 0) - (a.playtime_min ?? 0));
        if (shelfLogs.length === 0) return null;
        const meta = STATUS_META[status];

        return (
          <Shelf
            key={status}
            title={meta.label}
            count={shelfLogs.length}
            accent={meta.color}
            layout="grid"
            itemWidth={116}
          >
            {renderCovers(shelfLogs)}
          </Shelf>
        );
      })}
    </>
  );
}
