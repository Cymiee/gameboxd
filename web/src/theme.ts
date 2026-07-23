import type { GameStatus } from "@gameboxd/lib";

/**
 * TS accessors for the design tokens defined in styles/tokens.css.
 * Values are `var()` references — CSS remains the single source of truth.
 */

export const color = {
  bgBase: "var(--bg-base)",
  bgRaised: "var(--bg-raised)",
  bgCard: "var(--bg-card)",
  bgInset: "var(--bg-inset)",

  border: "var(--border)",
  borderStrong: "var(--border-strong)",

  text: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textMuted: "var(--text-muted)",

  accent: "var(--accent)",
  accentHover: "var(--accent-hover)",
  accentDim: "var(--accent-dim)",
  accentRing: "var(--accent-ring)",
  onAccent: "var(--on-accent)",

  danger: "var(--danger)",
  success: "var(--success)",
} as const;

export const radius = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  full: "var(--radius-full)",
} as const;

export const space = {
  1: "var(--space-1)",
  2: "var(--space-2)",
  3: "var(--space-3)",
  4: "var(--space-4)",
  5: "var(--space-5)",
  6: "var(--space-6)",
  7: "var(--space-7)",
  8: "var(--space-8)",
  9: "var(--space-9)",
} as const;

export const font = {
  display: "var(--font-display)",
  body: "var(--font-body)",
} as const;

export const type = {
  xs: "var(--text-xs)",
  sm: "var(--text-sm)",
  base: "var(--text-base)",
  lg: "var(--text-lg)",
  xl: "var(--text-xl)",
  "2xl": "var(--text-2xl)",
  "3xl": "var(--text-3xl)",
  display: "var(--text-display)",
} as const;

export const shadow = {
  card: "var(--shadow-card)",
  lift: "var(--shadow-lift)",
  modal: "var(--shadow-modal)",
} as const;

export const transition = "var(--transition)";

/** Shared style for the small uppercase "library label" used on shelf headers. */
export const labelStyle: React.CSSProperties = {
  fontFamily: font.body,
  fontSize: "var(--label-size)",
  fontWeight: 600,
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: color.textMuted,
};

/** Semantic status metadata — display label + its dedicated hue. */
export interface StatusMeta {
  label: string;
  color: string;
  dim: string;
}

export const STATUS_META: Record<GameStatus, StatusMeta> = {
  playing: {
    label: "Playing",
    color: "var(--status-playing)",
    dim: "var(--status-playing-dim)",
  },
  completed: {
    label: "Completed",
    color: "var(--status-completed)",
    dim: "var(--status-completed-dim)",
  },
  dropped: {
    label: "Dropped",
    color: "var(--status-dropped)",
    dim: "var(--status-dropped-dim)",
  },
  want_to_play: {
    label: "Wishlist",
    color: "var(--status-wishlist)",
    dim: "var(--status-wishlist-dim)",
  },
};

/** Favorites is a flag rather than a status, so it lives outside STATUS_META. */
export const FAVORITE_META: StatusMeta = {
  label: "Favorite",
  color: "var(--status-favorite)",
  dim: "var(--status-favorite-dim)",
};

/** Display order for status shelves. */
export const STATUS_ORDER: GameStatus[] = ["playing", "completed", "want_to_play", "dropped"];
