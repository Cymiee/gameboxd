import { NavLink, useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { useIsMobile } from "../hooks/useIsMobile";
import joystickIcon from "../assets/joystick-icon.png";

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
    color: isActive ? "var(--accent)" : "var(--muted)",
    textDecoration: "none",
    fontWeight: isActive ? 600 : 500,
    fontSize: "0.9rem",
    // Larger touch target on mobile
    padding: isMobile ? "0.6rem 0.25rem" : "0.25rem 0",
    borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
    transition: "color 0.15s, border-color 0.15s",
    whiteSpace: "nowrap",
  });

  return (
    <nav
      style={{
        background: scrolled ? "rgba(14,14,16,0.85)" : "#0e0e10",
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
        {/* Logo */}
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
          <img src={joystickIcon} alt="Shelved" style={{ width: isMobile ? 32 : 38, height: isMobile ? 32 : 38, objectFit: "contain" }} />
          {!isMobile && (
            <span
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: "1.25rem",
                color: "var(--accent)",
                letterSpacing: "0.01em",
              }}
            >
              Shelved
            </span>
          )}
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
              padding: "0.45rem 1rem",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: 999,
              fontSize: "0.875rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </form>

        {/* Nav links */}
        <NavLink to="/games" style={navLinkStyle}>Games</NavLink>
        <NavLink to="/feed" style={navLinkStyle}>Feed</NavLink>

        {/* Auth buttons (logged out) */}
        {!profile && (
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, marginLeft: isMobile ? "auto" : 0 }}>
            <Link
              to="/auth"
              style={{
                padding: "0.4rem 0.9rem",
                background: "transparent",
                border: "1px solid #27272a",
                color: "#71717a",
                borderRadius: 8,
                fontSize: "0.875rem",
                textDecoration: "none",
                transition: "border-color 0.15s, color 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3f3f46";
                e.currentTarget.style.color = "#fafafa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#27272a";
                e.currentTarget.style.color = "#71717a";
              }}
            >
              Log in
            </Link>
            <Link
              to="/auth?mode=signup"
              style={{
                padding: "0.4rem 0.9rem",
                background: "#e4ff1a",
                border: "none",
                color: "#0e0e10",
                borderRadius: 8,
                fontSize: "0.875rem",
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
                fontFamily: "Syne, sans-serif",
              }}
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
                borderRadius: 8,
                background: dropdownOpen ? "var(--surface)" : "transparent",
                transition: "background 0.15s",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  color: "#0e0e10",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  flexShrink: 0,
                  fontFamily: "Syne, sans-serif",
                }}
              >
                {profile.username[0]?.toUpperCase()}
              </div>
              {!isMobile && (
                <span style={{ color: "var(--text)", fontSize: "0.875rem" }}>
                  {profile.username}
                </span>
              )}
              <span style={{ color: "var(--muted)", fontSize: "0.6rem", marginLeft: 2 }}>▼</span>
            </div>

            {dropdownOpen && (
              <div
                onMouseEnter={openDropdown}
                onMouseLeave={closeDropdown}
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
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
                      color: "var(--text)",
                      textDecoration: "none",
                      fontSize: "0.875rem",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
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
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
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
