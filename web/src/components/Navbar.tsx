import { NavLink, useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { useAuthStore } from "../store/auth";

export default function Navbar() {
  const { profile, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/auth");
    } finally {
      setLoggingOut(false);
    }
  };

  const openSearch = () => {
    setSearchOpen(true);
    // Focus after the element renders
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/games?q=${encodeURIComponent(q)}`);
    closeSearch();
  };

  const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    color: isActive ? "var(--accent)" : "var(--muted)",
    textDecoration: "none",
    fontWeight: isActive ? 600 : 400,
    fontSize: "0.9rem",
    padding: "0.25rem 0",
    borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
    transition: "color 0.15s, border-color 0.15s",
  });

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.75rem 2rem",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        gap: "1rem",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--accent)", flexShrink: 0 }}>
        Gameboxd
      </span>

      {/* Center nav links — hidden when search is open */}
      {!searchOpen && (
        <div style={{ display: "flex", gap: "2rem" }}>
          <NavLink to="/" end style={navLinkStyle}>Feed</NavLink>
          <NavLink to="/games" style={navLinkStyle}>Games</NavLink>
          <NavLink to="/friends" style={navLinkStyle}>Friends</NavLink>
        </div>
      )}

      {/* Expanded search bar */}
      {searchOpen && (
        <form
          onSubmit={handleSearchSubmit}
          style={{ flex: 1, display: "flex", gap: "0.5rem", maxWidth: 480 }}
        >
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games..."
            onKeyDown={(e) => e.key === "Escape" && closeSearch()}
            style={{
              flex: 1,
              padding: "0.4rem 0.75rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: 6,
              fontSize: "0.9rem",
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.4rem 0.9rem",
              background: "var(--accent)",
              border: "none",
              color: "#fff",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            Go
          </button>
          <button
            type="button"
            onClick={closeSearch}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "1rem",
              padding: "0 0.25rem",
            }}
          >
            ✕
          </button>
        </form>
      )}

      {/* Right: search icon + user */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
        {/* Search icon */}
        {!searchOpen && (
          <button
            onClick={openSearch}
            title="Search games"
            style={{
              background: "none",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              borderRadius: 6,
              padding: "0.3rem 0.55rem",
              cursor: "pointer",
              fontSize: "0.95rem",
              lineHeight: 1,
            }}
          >
            🔍
          </button>
        )}

        {profile && (
          <>
            <NavLink
              to={`/profile/${profile.id}`}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}
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
                }}
              >
                {profile.username[0]?.toUpperCase()}
              </div>
              <span style={{ color: "var(--text)", fontSize: "0.9rem" }}>{profile.username}</span>
            </NavLink>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                color: "var(--muted)",
                padding: "0.3rem 0.75rem",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
