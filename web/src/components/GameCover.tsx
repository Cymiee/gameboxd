import { useState } from "react";
import type { CoverSize } from "@gameboxd/lib";
import { getCoverUrl } from "@gameboxd/lib";
import { color, radius, font } from "../theme";

interface Props {
  name: string;
  /** IGDB cover image id. Omit/undefined renders the fallback tile. */
  imageId?: string | undefined;
  size?: CoverSize;
  /** Enables the hover lift + amber ring. Off for static/decorative covers. */
  interactive?: boolean;
  /** Corner rounding. Cards use "lg"; small inline thumbs use "sm". */
  rounding?: "sm" | "md" | "lg";
  /** Rendered on top of the cover — badges, rating pills, overlays. */
  children?: React.ReactNode;
  onClick?: (() => void) | undefined;
}

/**
 * The single cover-art primitive. IGDB art is inconsistent — missing covers,
 * landscape key art, odd ratios — so every cover in the app goes through here
 * to guarantee a fixed 3:4 frame and a branded fallback instead of a broken
 * image or a squished one.
 */
export default function GameCover({
  name,
  imageId,
  size = "cover_big",
  interactive = false,
  rounding = "lg",
  children,
  onClick,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [failed, setFailed] = useState(false);

  const showFallback = !imageId || failed;
  const corner = rounding === "lg" ? radius.lg : rounding === "md" ? radius.md : radius.sm;

  return (
    <div
      onClick={onClick}
      {...(interactive
        ? {
            onMouseEnter: () => setHovered(true),
            onMouseLeave: () => setHovered(false),
          }
        : {})}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "3 / 4",
        borderRadius: corner,
        overflow: "hidden",
        background: color.bgCard,
        border: `1px solid ${hovered ? color.accentRing : color.border}`,
        boxShadow: hovered ? "var(--shadow-hover), var(--glow-soft)" : "var(--shadow-card)",
        transform: hovered ? "translateY(-4px)" : "none",
        transition: `transform var(--transition-slow), border-color var(--transition-slow), box-shadow var(--transition-slow)`,
        cursor: onClick ? "pointer" : "default",
        willChange: "transform",
      }}
    >
      {showFallback ? (
        <FallbackTile name={name} />
      ) : (
        <img
          src={getCoverUrl(imageId, size)}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: hovered ? "scale(1.06)" : "none",
            transition: `transform 0.5s var(--ease-out)`,
          }}
        />
      )}
      {children}
    </div>
  );
}

/** Branded stand-in for missing/broken art: title + a subtle spine mark. */
function FallbackTile({ name }: { name: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        padding: "var(--space-4)",
        background: `linear-gradient(160deg, ${color.bgCard}, ${color.bgInset})`,
        textAlign: "center",
      }}
    >
      <SpineMark />
      <span
        style={{
          fontFamily: font.display,
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          lineHeight: 1.3,
          color: color.textSecondary,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {name}
      </span>
    </div>
  );
}

/** Minimal book-spine glyph — structural nod to the library metaphor. */
function SpineMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="4.5" height="16" rx="1.2" stroke={color.textMuted} strokeWidth="1.4" />
      <rect x="9.75" y="4" width="4.5" height="16" rx="1.2" stroke={color.textMuted} strokeWidth="1.4" />
      <rect
        x="16.5"
        y="5.5"
        width="4.5"
        height="16"
        rx="1.2"
        stroke={color.textMuted}
        strokeWidth="1.4"
        transform="rotate(-9 16.5 5.5)"
      />
    </svg>
  );
}
