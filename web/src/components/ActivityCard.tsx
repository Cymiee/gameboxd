import type { ActivityRow, UserRow, IGDBGame } from "@gameboxd/lib";
import { getCoverUrl } from "@gameboxd/lib";
import { Link } from "react-router-dom";

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

function activityText(
  activity: ActivityRow,
  username: string,
  gameName: string
): React.ReactNode {
  const meta = activity.metadata;
  switch (activity.type) {
    case "rated":
      return (
        <>
          <strong>{username}</strong> rated <strong>{gameName}</strong>{" "}
          {String(meta.rating)}/10
        </>
      );
    case "reviewed":
      return (
        <>
          <strong>{username}</strong> reviewed <strong>{gameName}</strong>
        </>
      );
    case "logged":
      return (
        <>
          <strong>{username}</strong> logged <strong>{gameName}</strong>{" "}
          <span style={{ color: "var(--muted)", textTransform: "capitalize" }}>
            ({String(meta.status).replace("_", " ")})
          </span>
        </>
      );
    case "topped":
      return (
        <>
          <strong>{username}</strong> added <strong>{gameName}</strong> to their top games
        </>
      );
    default:
      return (
        <>
          <strong>{username}</strong> logged <strong>{gameName}</strong>
        </>
      );
  }
}

export default function ActivityCard({ activity, user, game }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        alignItems: "flex-start",
        padding: "0.75rem",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
      }}
    >
      {game.cover ? (
        <img
          src={getCoverUrl(game.cover.image_id, "thumb")}
          alt={game.name}
          style={{ width: 40, height: 57, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 40,
            height: 57,
            background: "var(--border)",
            borderRadius: 4,
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.875rem", color: "var(--text)", lineHeight: 1.45 }}>
          {activityText(activity, user.username, game.name)}
        </div>
        <div style={{ marginTop: "0.25rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Link
            to={`/profile/${user.id}`}
            style={{ fontSize: "0.75rem", color: "var(--accent)" }}
          >
            {user.username}
          </Link>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            · {timeAgo(activity.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
