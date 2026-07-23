import { NavLink, useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { useIsMobile } from "../hooks/useIsMobile";

export default function Navbar() {
  const { profile, logout } = useAuthStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    setLoggingOut(true);
    try {
      await logout();
      navigate("/auth");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/games?q=${encodeURIComponent(q)}`);
  };

  const openDropdown = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setDropdownOpen(true);
  };

  const closeDropdown = () => {
    closeTimer.current = setTimeout(() => setDropdownOpen(false), 120);
  };

  const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    color: isActive ? "var(--accent)" : "var(--text-muted)",
    textDecoration: "none",
    fontWeight: isActive ? 600 : 500,
    fontSize: "var(--text-sm)",
    // Larger touch target on mobile
    padding: isMobile ? "0.6rem 0.15rem" : "0.25rem 0",
    borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
    transition: "color 0.15s, border-color 0.15s",
    whiteSpace: "nowrap",
  });

  return (
    <nav
      style={{
        background: scrolled ? "rgba(14, 13, 12, 0.82)" : "var(--bg-base)",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        transition: "background 0.2s",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: isMobile ? "0.5rem 16px" : "0 24px",
          minHeight: 60,
          display: "flex",
          alignItems: "center",
          // On mobile the search form wraps onto its own full-width row
          flexWrap: isMobile ? "wrap" : "nowrap",
          gap: isMobile ? "0.75rem" : "1.25rem",
        }}
      >
        {/* Wordmark — typographic, no icon */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: isMobile ? "var(--text-lg)" : "var(--text-xl)",
              color: "var(--text-primary)",
              letterSpacing: "-0.015em",
            }}
          >
            Shelved
          </span>
          {/* Amber tittle — the single accent mark in the chrome */}
          <span
            aria-hidden
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--accent)",
              flexShrink: 0,
              alignSelf: "flex-end",
              marginBottom: isMobile ? 6 : 7,
            }}
          />
        </Link>

        {/* Search — full-width second row on mobile */}
        <form
          onSubmit={handleSearchSubmit}
          style={
            isMobile
              ? { order: 10, flexBasis: "100%", margin: 0 }
              : { flex: 1, maxWidth: 480, margin: "0 auto" }
          }
        >
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games..."
            style={{
              width: "100%",
              padding: "0.5rem 1rem",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              borderRadius: "var(--radius-full)",
              fontSize: "var(--text-sm)",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color var(--transition)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-ring)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
        </form>

        {/* Nav links */}
        <NavLink to="/games" style={navLinkStyle}>Games</NavLink>
        <NavLink to="/feed" style={navLinkStyle}>Feed</NavLink>

        {/* Auth buttons (logged out).
            On mobile "Log in" drops its chrome to a plain text link — the
            bordered pair overflowed the 375px row. */}
        {!profile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "0.6rem" : "0.5rem",
              flexShrink: 0,
              marginLeft: "auto",
            }}
          >
            <Link
              to="/auth"
              style={{
                padding: isMobile ? "0.25rem 0" : "0.4rem 0.9rem",
                background: "transparent",
                border: isMobile ? "none" : "1px solid var(--border)",
                color: "var(--text-secondary)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-sm)",
                textDecoration: "none",
                transition: "border-color var(--transition), color var(--transition)",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isMobile) e.currentTarget.style.borderColor = "var(--border-strong)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                if (!isMobile) e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Log in
            </Link>
            <Link
              to="/auth?mode=signup"
              style={{
                padding: isMobile ? "0.4rem 0.8rem" : "0.4rem 0.9rem",
                background: "var(--accent)",
                border: "none",
                color: "var(--on-accent)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-body)",
                transition: "background var(--transition)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
            >
              Sign up
            </Link>
          </div>
        )}

        {/* User dropdown */}
        {profile && (
          <div
            onMouseEnter={openDropdown}
            onMouseLeave={closeDropdown}
            style={{ position: "relative", flexShrink: 0, marginLeft: isMobile ? "auto" : 0 }}
          >
            <div
              // Hover alone doesn't work on touch screens — tap toggles too
              onClick={() => setDropdownOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                padding: "0.25rem 0.5rem",
                borderRadius: "var(--radius-sm)",
                background: dropdownOpen ? "var(--bg-card)" : "transparent",
                transition: "background 0.15s",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  flexShrink: 0,
                  fontFamily: "var(--font-body)",
                }}
              >
                {profile.username[0]?.toUpperCase()}
              </div>
              {!isMobile && (
                <span style={{ color: "var(--text-primary)", fontSize: "0.875rem" }}>
                  {profile.username}
                </span>
              )}
              <span style={{ color: "var(--text-muted)", fontSize: "0.6rem", marginLeft: 2 }}>▼</span>
            </div>

            {dropdownOpen && (
              <div
                onMouseEnter={openDropdown}
                onMouseLeave={closeDropdown}
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  minWidth: 170,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  overflow: "hidden",
                  zIndex: 200,
                }}
              >
                {[
                  { label: "Profile", to: `/profile/${profile.id}` },
                  { label: "Want to Play", to: "/want-to-play" },
                  { label: "Friends", to: "/friends" },
                  { label: "Settings", to: "/settings" },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: "block",
                      padding: "0.6rem 1rem",
                      color: "var(--text-primary)",
                      textDecoration: "none",
                      fontSize: "0.875rem",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-base)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {item.label}
                  </Link>
                ))}

                <div style={{ height: 1, background: "var(--border)", margin: "0.25rem 0" }} />

                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "0.6rem 1rem",
                    background: "none",
                    border: "none",
                    color: "var(--danger)",
                    fontSize: "0.875rem",
                    cursor: loggingOut ? "not-allowed" : "pointer",
                    opacity: loggingOut ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-base)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
