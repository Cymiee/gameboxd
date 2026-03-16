import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../store/auth";

export default function Navbar() {
  const { profile, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/auth");
    } finally {
      setLoggingOut(false);
    }
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
      }}
    >
      <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--accent)" }}>
        Gameboxd
      </span>

      <div style={{ display: "flex", gap: "2rem" }}>
        <NavLink to="/" end style={navLinkStyle}>
          Feed
        </NavLink>
        <NavLink to="/search" style={navLinkStyle}>
          Search
        </NavLink>
        <NavLink to="/friends" style={navLinkStyle}>
          Friends
        </NavLink>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
