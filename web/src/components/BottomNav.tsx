import { NavLink } from "react-router-dom";
import { useAuthStore } from "../store/auth";

/**
 * Fixed bottom navigation for mobile. Four primary destinations at most —
 * auth-only entries are hidden when signed out rather than redirecting, so the
 * bar stays uncluttered. Desktop uses the inline links in Navbar instead.
 */
export default function BottomNav() {
  const { userId } = useAuthStore();

  const items = [
    { to: "/", label: "Home", icon: HomeIcon, end: true },
    { to: "/explore", label: "Explore", icon: ExploreIcon, end: false },
    ...(userId
      ? [
          { to: "/shelf", label: "My Shelf", icon: ShelfIcon, end: false },
          { to: `/profile/${userId}`, label: "Profile", icon: ProfileIcon, end: false },
        ]
      : []),
  ];

  return (
    <nav
      aria-label="Primary"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 120,
        display: "flex",
        background: "rgba(14, 13, 12, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="press"
          style={({ isActive }) => ({
            position: "relative",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            padding: "0.5rem 0.25rem",
            minHeight: 54,
            textDecoration: "none",
            color: isActive ? "var(--accent)" : "var(--text-muted)",
            fontSize: "0.6875rem",
            fontWeight: isActive ? 600 : 500,
            transition: "color var(--transition)",
          })}
        >
          {({ isActive }) => (
            <>
              {/* Active-tab glow indicator */}
              <span
                aria-hidden
                className={isActive ? "reveal-pop" : undefined}
                style={{
                  position: "absolute",
                  top: 6,
                  width: 22,
                  height: 3,
                  borderRadius: "var(--radius-full)",
                  background: isActive ? "var(--grad-brand)" : "transparent",
                  boxShadow: isActive ? "var(--glow-soft)" : "none",
                }}
              />
              <span
                style={{
                  display: "inline-flex",
                  transform: isActive ? "translateY(2px) scale(1.08)" : "none",
                  transition: "transform var(--transition)",
                }}
              >
                <Icon active={isActive} />
              </span>
              <span style={{ whiteSpace: "nowrap" }}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

// ── Icons — minimal line glyphs, inherit currentColor ────────────────────────

interface IconProps {
  active: boolean;
}

const base = (active: boolean) => ({
  width: 20,
  height: 20,
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: active ? 2 : 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

function HomeIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(active)}>
      <path d="M3 10.5 12 3.5l9 7" />
      <path d="M5.5 9.5V20h13V9.5" />
    </svg>
  );
}

function ExploreIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(active)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </svg>
  );
}

/** Three book spines — matches the fallback glyph on GameCover. */
function ShelfIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(active)}>
      <rect x="3.5" y="4.5" width="4.5" height="15" rx="1.2" />
      <rect x="10" y="4.5" width="4.5" height="15" rx="1.2" />
      <path d="m17.2 5.6 3.3.9-2.6 13.1-3.3-.9z" />
    </svg>
  );
}

function ProfileIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(active)}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c.6-3.6 3.6-5.8 7.2-5.8s6.6 2.2 7.2 5.8" />
    </svg>
  );
}
