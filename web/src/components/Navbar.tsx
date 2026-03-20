import { NavLink, useNavigate, Link } from "react-router-dom";
import { useState, useRef } from "react";
import { useAuthStore } from "../store/auth";
import joystickIcon from "../assets/joystick-icon.png";

export default function Navbar() {
  const { profile, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    fontWeight: isActive ? 600 : 400,
    fontSize: "0.9rem",
    padding: "0.25rem 0",
    borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
    transition: "color 0.15s, border-color 0.15s",
    whiteSpace: "nowrap",
  });

  return (
    <nav
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Inner container */}
      <div
        style={{
          maxWidth: 1500,
          margin: "0 auto",
          padding: "0.55rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1.25rem",
        }}
      >
      {/* Left: Logo */}
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
        <img src={joystickIcon} alt="Shelved" style={{ width: 28, height: 28, objectFit: "contain" }} />
        <span
          style={{
            fontFamily: "Audiowide, sans-serif",
            fontSize: "1.35rem",
            color: "var(--accent)",
            letterSpacing: "0.02em",
          }}
        >
          Shelved
        </span>
      </Link>

      {/* Center: wide search bar */}
      <form onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: 520, margin: "0 auto" }}>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search games..."
          style={{
            width: "100%",
            padding: "0.5rem 1.1rem",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            borderRadius: 8,
            fontSize: "0.925rem",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </form>

      {/* Right group: Games + Feed */}
      <NavLink to="/games" style={navLinkStyle}>Games</NavLink>
      <NavLink to="/feed" style={navLinkStyle}>Feed</NavLink>

      {/* User dropdown */}
      {profile && (
        <div
          onMouseEnter={openDropdown}
          onMouseLeave={closeDropdown}
          style={{ position: "relative", flexShrink: 0 }}
        >
          {/* Trigger */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              padding: "0.25rem 0.5rem",
              borderRadius: 6,
              transition: "background 0.15s",
              background: dropdownOpen ? "var(--bg)" : "transparent",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "var(--accent)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.8rem",
                flexShrink: 0,
              }}
            >
              {profile.username[0]?.toUpperCase()}
            </div>
            <span style={{ color: "var(--text)", fontSize: "0.9rem" }}>{profile.username}</span>
            <span style={{ color: "var(--muted)", fontSize: "0.65rem", marginLeft: 2 }}>▼</span>
          </div>

          {/* Dropdown panel */}
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
                boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
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
                    fontSize: "0.9rem",
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
                  color: "#e05555",
                  fontSize: "0.9rem",
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
      </div>{/* end inner container */}
    </nav>
  );
}
