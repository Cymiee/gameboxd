import type { GameStatus } from "@gameboxd/lib";
import { STATUS_META, FAVORITE_META, font } from "../theme";

interface Props {
  status: GameStatus;
  size?: "sm" | "md";
}

/**
 * Small semantic status label. Deliberately a chip rather than a filled block —
 * status is metadata, not decoration, and must never compete with the accent.
 */
export default function StatusChip({ status, size = "md" }: Props) {
  const meta = STATUS_META[status];
  return <Chip label={meta.label} color={meta.color} dim={meta.dim} size={size} pulse={status === "playing"} />;
}

export function FavoriteChip({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <Chip
      label={FAVORITE_META.label}
      color={FAVORITE_META.color}
      dim={FAVORITE_META.dim}
      size={size}
    />
  );
}

function Chip({
  label,
  color,
  dim,
  size,
  pulse = false,
}: {
  label: string;
  color: string;
  dim: string;
  size: "sm" | "md";
  pulse?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: size === "sm" ? "2px 8px" : "3px 10px",
        borderRadius: "var(--radius-full)",
        background: dim,
        border: `1px solid ${color}`,
        color,
        fontFamily: font.body,
        fontSize: size === "sm" ? "0.6875rem" : "var(--text-xs)",
        fontWeight: 600,
        letterSpacing: "0.02em",
        lineHeight: 1.5,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden
        className={pulse ? "pulse-dot" : undefined}
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          ...(pulse ? { ["--pulse-color" as string]: color } : {}),
        }}
      />
      {label}
    </span>
  );
}
