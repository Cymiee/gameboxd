import type { ActivityRow, UserRow, IGDBGame } from "@gameboxd/lib";
import { Link } from "react-router-dom";
import GameCover from "./GameCover";

interface Props {
  activity: ActivityRow;
  user: Pick<UserRow, "id" | "username" | "avatar_url">;
  game: Pick<IGDBGame, "id" | "name" | "cover">;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/** Natural-language verb for a "logged" activity, based on its status. */
function loggedVerb(status: string): string {
  switch (status) {
    case "completed":    return "finished";
    case "played":       return "played";
    case "dropped":      return "dropped";
    case "playing":      return "started playing";
    case "want_to_play": return "wants to play";
    default:             return "logged";
  }
}

function activityText(
  activity: ActivityRow,
  username: string,
  gameName: string
): React.ReactNode {
  const meta = activity.metadata;
  const who = <strong>{username}</strong>;
  const what = <strong>{gameName}</strong>;
  switch (activity.type) {
    case "rated":
      return <>{who} rated {what} {String(meta.rating)}/10</>;
    case "reviewed":
      return <>{who} reviewed {what}</>;
    case "topped":
      return <>{who} added {what} to their favourites</>;
    case "logged":
      return <>{who} {loggedVerb(String(meta.status))} {what}</>;
    default:
      return <>{who} logged {what}</>;
  }
}

export default function ActivityCard({ activity, user, game }: Props) {
  return (
    <div
      className="hover-glow"
      style={{
        display: "flex",
        gap: "var(--space-4)",
        alignItems: "flex-start",
        padding: "var(--space-4)",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <Link to={`/game/${game.id}`} style={{ width: 42, flexShrink: 0 }}>
        <GameCover name={game.name} imageId={game.cover?.image_id} size="thumb" rounding="sm" interactive />
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)", lineHeight: 1.5 }}>
          {activityText(activity, user.username, game.name)}
        </div>
        <div style={{ marginTop: "var(--space-2)", display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <Link
            to={`/profile/${user.id}`}
            style={{ fontSize: "var(--text-xs)", color: "var(--accent)" }}
          >
            {user.username}
          </Link>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            · {timeAgo(activity.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
