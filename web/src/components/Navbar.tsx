import { NavLink, useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/auth";
import joystickIcon from "../assets/joystick-icon.png";

export default function Navbar() {
  const { profile, logout } = useAuthStore();
  const navigate = useNavigate();
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
    padding: "0.25rem 0",
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
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          gap: "1.25rem",
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
          <img src={joystickIcon} alt="Shelved" style={{ width: 38, height: 38, objectFit: "contain" }} />
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
        </Link>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: 480, margin: "0 auto" }}>
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

        {/* User dropdown */}
        {profile && (
          <div
            onMouseEnter={openDropdown}
            onMouseLeave={closeDropdown}
            style={{ position: "relative", flexShrink: 0 }}
          >
            <div
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
              <span style={{ color: "var(--text)", fontSize: "0.875rem" }}>
                {profile.username}
              </span>
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
