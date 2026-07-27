interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Clean rounded magnifier — shared by the navbar search and log modal. */
export function SearchIcon({ size = 20, color = "currentColor", strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0, display: "block" }}>
      <circle cx="11" cy="11" r="7" stroke={color} strokeWidth={strokeWidth} />
      <path d="m20 20-3.2-3.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

/** Rounded close (X). */
export function CloseIcon({ size = 20, color = "currentColor", strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0, display: "block" }}>
      <path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

/** Plus — for the "+ LOG" button. */
export function PlusIcon({ size = 18, color = "currentColor", strokeWidth = 2.4 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0, display: "block" }}>
      <path d="M12 5v14M5 12h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}
