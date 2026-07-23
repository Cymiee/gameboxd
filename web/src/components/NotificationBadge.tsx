interface Props {
  count: number;
  /** "dot" ignores the number and shows a small marker (for tight spots). */
  variant?: "count" | "dot";
  /** Absolutely position to the top-right of a positioned parent. */
  floating?: boolean;
}

/** Amber notification indicator. Renders nothing when count is 0. */
export default function NotificationBadge({ count, variant = "count", floating = false }: Props) {
  if (count <= 0) return null;

  const floatStyle: React.CSSProperties = floating
    ? { position: "absolute", top: -4, right: -6 }
    : {};

  if (variant === "dot") {
    return (
      <span
        aria-label={`${count} new`}
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: "var(--accent)",
          border: "2px solid var(--bg-base)",
          flexShrink: 0,
          ...floatStyle,
        }}
      />
    );
  }

  return (
    <span
      aria-label={`${count} new`}
      style={{
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        borderRadius: "var(--radius-full)",
        background: "var(--accent)",
        color: "var(--on-accent)",
        fontSize: "0.6875rem",
        fontWeight: 700,
        lineHeight: "18px",
        textAlign: "center",
        fontVariantNumeric: "tabular-nums",
        flexShrink: 0,
        ...floatStyle,
      }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
