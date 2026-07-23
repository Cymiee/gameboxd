import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useIsMobile } from "../hooks/useIsMobile";

const COVER_IMAGES = [
  { id: "co4jni", name: "Elden Ring" },
  { id: "co1rgi", name: "Hollow Knight" },
  { id: "co1tnm", name: "Red Dead Redemption 2" },
  { id: "co1wyy", name: "The Witcher 3" },
  { id: "co20jg", name: "Disco Elysium" },
];

function coverUrl(imageId: string) {
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const fromPath = searchParams.get("from");

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const { login, register, loading } = useAuthStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  function extractMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
    return "Something went wrong. Please try again.";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConfirmationSent(false);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      if (mode === "login") {
        await login(email, password);
        navigate(fromPath ?? "/");
      } else {
        const { needsConfirmation } = await register(email, password, username);
        if (needsConfirmation) {
          setConfirmationSent(true);
        } else {
          navigate(fromPath ?? "/");
        }
      }
    } catch (err) {
      setError(extractMessage(err));
    }
  }

  const fieldStyle: React.CSSProperties = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "0.7rem 0.9rem",
    color: "var(--text)",
    fontSize: "0.95rem",
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        height: isMobile ? "auto" : "100vh",
        overflow: isMobile ? "visible" : "hidden",
      }}
    >
      {/* ── Left panel (brand) — hidden on mobile ── */}
      {!isMobile && (
      <div
        style={{
          flex: 1,
          background: "#0e0e10",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Dot-grid texture */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(228,255,26,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            pointerEvents: "none",
          }}
        />

        {/* Centre content */}
        <div style={{ position: "relative", padding: "0 3rem" }}>
          <div
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "3rem",
              fontWeight: 800,
              color: "#e4ff1a",
              marginBottom: "0.75rem",
              lineHeight: 1,
            }}
          >
            Shelved
          </div>

          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "1rem",
              color: "#71717a",
              marginBottom: "2rem",
              lineHeight: 1.5,
            }}
          >
            Track, rate, and discover games with your friends.
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[
              "Log every game you play",
              "Show off your top 3",
              "See what your friends are playing",
            ].map((text) => (
              <li
                key={text}
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.875rem",
                  color: "#71717a",
                  display: "flex",
                  gap: "0.5rem",
                }}
              >
                <span style={{ color: "#e4ff1a", flexShrink: 0 }}>·</span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Cover strip pinned to bottom */}
        <div
          style={{
            position: "absolute",
            bottom: "2rem",
            left: "3rem",
            right: "3rem",
            display: "flex",
            gap: "0.6rem",
          }}
        >
          {COVER_IMAGES.map((cover) => (
            <img
              key={cover.id}
              src={coverUrl(cover.id)}
              alt={cover.name}
              style={{
                width: 70,
                height: 94,
                borderRadius: 4,
                objectFit: "cover",
                opacity: 0.75,
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>
      )}

      {/* ── Right panel ── */}
      <div
        style={{
          flex: 1,
          background: "#18181b",
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "center",
          padding: isMobile ? "2.5rem 1.25rem" : "2rem",
          overflowY: "auto",
        }}
      >
        <div style={{ width: "100%", maxWidth: 360 }}>
          {/* Compact wordmark replaces the hidden brand panel on mobile */}
          {isMobile && (
            <div
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: "2rem",
                fontWeight: 800,
                color: "#e4ff1a",
                marginBottom: "1.5rem",
                lineHeight: 1,
              }}
            >
              Shelved
            </div>
          )}
          {/* "Sign in to continue" banner */}
          {fromPath && (
            <div
              style={{
                background: "rgba(228,255,26,0.08)",
                border: "1px solid rgba(228,255,26,0.2)",
                borderRadius: 6,
                padding: "0.4rem 0.8rem",
                fontSize: 13,
                color: "#e4ff1a",
                marginBottom: "1.5rem",
                textAlign: "center",
              }}
            >
              Sign in to continue
            </div>
          )}

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.75rem" }}>
            {(["login", "signup"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setMode(tab); setError(null); }}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: mode === tab ? "2px solid #e4ff1a" : "2px solid transparent",
                  color: mode === tab ? "#fafafa" : "#71717a",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontWeight: mode === tab ? 600 : 400,
                  padding: "0 0 0.4rem",
                  transition: "color 0.15s, border-color 0.15s",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {tab === "login" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
          >
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={fieldStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={fieldStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={fieldStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />

            {mode === "signup" && (
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={fieldStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            )}

            {error && (
              <p style={{ color: "var(--danger)", fontSize: "0.875rem", margin: 0 }}>{error}</p>
            )}

            {confirmationSent && (
              <p style={{ color: "#4ade80", fontSize: "0.875rem", margin: 0, lineHeight: 1.5 }}>
                Check your email to confirm your account, then sign in.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: "var(--accent)",
                color: "#0e0e10",
                border: "none",
                borderRadius: 8,
                padding: "0.75rem",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.95rem",
                fontWeight: 700,
                opacity: loading ? 0.7 : 1,
                fontFamily: "Syne, sans-serif",
                marginTop: "0.25rem",
                width: "100%",
              }}
            >
              {loading ? "Loading…" : mode === "login" ? "Sign in" : "Sign up"}
            </button>

            {mode === "signup" && (
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  color: "#71717a",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                By signing up you agree to our Terms of Service
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
