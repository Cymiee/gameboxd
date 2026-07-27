import { NavLink, useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { useNotificationsStore } from "../store/notifications";
import { useIsMobile } from "../hooks/useIsMobile";
import NotificationBadge from "./NotificationBadge";
import Avatar from "./Avatar";
import LogSearchModal from "./LogSearchModal";
import { SearchIcon, CloseIcon, PlusIcon } from "./icons";

export default function Navbar() {
  const { profile, logout } = useAuthStore();
  const pendingRequests = useNotificationsStore((s) => s.pendingRequests);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Focus the field the moment the search expands.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); };

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
    navigate(`/explore?q=${encodeURIComponent(q)}`);
    closeSearch();
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
    <>
    {logOpen && <LogSearchModal onClose={() => setLogOpen(false)} />}
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
          className="press"
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
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--grad-brand)",
              boxShadow: "var(--glow-soft)",
              flexShrink: 0,
              alignSelf: "flex-end",
              marginBottom: isMobile ? 6 : 7,
            }}
          />
        </Link>

        {/* Primary nav — desktop only; mobile uses the fixed BottomNav */}
        {!isMobile && (
          <>
            <NavLink to="/" end style={navLinkStyle}>Home</NavLink>
            <NavLink to="/explore" style={navLinkStyle}>Explore</NavLink>
            {profile && <NavLink to="/shelf" style={navLinkStyle}>My Shelf</NavLink>}
            {profile && (
              <NavLink to={`/profile/${profile.id}`} style={navLinkStyle}>Profile</NavLink>
            )}
          </>
        )}

        {/* Collapsible search — expands from the icon; full-width row on mobile */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: "flex",
            overflow: "hidden",
            marginLeft: isMobile ? 0 : "auto",
            opacity: searchOpen ? 1 : 0,
            width: isMobile ? (searchOpen ? "100%" : 0) : (searchOpen ? 240 : 0),
            transition: "width var(--transition-slow), opacity var(--transition-slow)",
            ...(isMobile && searchOpen ? { order: 10, flexBasis: "100%" } : {}),
          }}
        >
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games..."
            tabIndex={searchOpen ? 0 : -1}
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

        {/* Search toggle */}
        <button
          type="button"
          className="press"
          aria-label={searchOpen ? "Close search" : "Search"}
          onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          style={{
            marginLeft: isMobile ? "auto" : 0,
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-full)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            flexShrink: 0,
            transition: "border-color var(--transition), color var(--transition)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          {searchOpen ? <CloseIcon size={18} /> : <SearchIcon size={18} />}
        </button>

        {/* + LOG — the primary CTA; opens a search-to-log flow */}
        {profile && (
          <button
            type="button"
            className="btn-pop"
            onClick={() => setLogOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: isMobile ? "0.5rem 0.85rem" : "0.5rem 1.05rem",
              background: "var(--accent)",
              border: "none",
              color: "var(--on-accent)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-sm)",
              fontWeight: 700,
              letterSpacing: "0.03em",
              cursor: "pointer",
              flexShrink: 0,
              fontFamily: "var(--font-body)",
            }}
          >
            <PlusIcon size={15} /> LOG
          </button>
        )}

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
              className="btn-pop"
              to="/auth?mode=signup"
              style={{
                padding: isMobile ? "0.4rem 0.9rem" : "0.45rem 1rem",
                background: "var(--accent)",
                border: "none",
                color: "var(--on-accent)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-body)",
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
            style={{ position: "relative", flexShrink: 0 }}
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
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Avatar username={profile.username} avatarUrl={profile.avatar_url} size={30} variant="solid" />
                <NotificationBadge count={pendingRequests} floating />
              </div>
              {!isMobile && (
                <span style={{ color: "var(--text-primary)", fontSize: "0.875rem" }}>
                  {profile.username}
                </span>
              )}
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.6rem",
                  marginLeft: 2,
                  display: "inline-block",
                  transform: dropdownOpen ? "rotate(180deg)" : "none",
                  transition: "transform var(--transition)",
                }}
              >▼</span>
            </div>

            {dropdownOpen && (
              <div
                className="reveal-pop"
                onMouseEnter={openDropdown}
                onMouseLeave={closeDropdown}
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  minWidth: 170,
                  boxShadow: "var(--shadow-lift)",
                  overflow: "hidden",
                  zIndex: 200,
                  transformOrigin: "top right",
                  animationDuration: "200ms",
                }}
              >
                {[
                  // Profile and My Shelf live in the primary nav now, so the
                  // dropdown carries only the secondary destinations.
                  { label: "Wishlist", to: "/want-to-play", badge: 0 },
                  { label: "Friends", to: "/friends", badge: pendingRequests },
                  { label: "Settings", to: "/settings", badge: 0 },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
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
                    <NotificationBadge count={item.badge} />
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
    </>
  );
}
