import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useIsMobile } from "../hooks/useIsMobile";
import GameCover from "../components/GameCover";

const COVER_IMAGES = [
  { id: "co4jni", name: "Elden Ring" },
  { id: "coaes9", name: "Hollow Knight" },
  { id: "coaarl", name: "The Witcher 3" },
  { id: "co1q1f", name: "Red Dead Redemption 2" },
  { id: "co9j3v", name: "Disco Elysium" },
  { id: "co4rs3", name: "Hades" },
  { id: "cob9dh", name: "Celeste" },
  { id: "coa93h", name: "Stardew Valley" },
];

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const fromPath = searchParams.get("from");

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  // Phase 1 signup is two steps: 1 = email, 2 = username + password.
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
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

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setError(null);
    setConfirmationSent(false);
    setSignupStep(1);
  }

  function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    setSignupStep(2);
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
    background: "var(--bg-inset)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "0.8rem 0.95rem",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
  };

  const submitStyle: React.CSSProperties = {
    background: "var(--grad-brand)",
    color: "var(--on-accent)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "0.85rem",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: 600,
    fontFamily: "var(--font-body)",
    marginTop: "0.75rem",
    width: "100%",
    boxShadow: "var(--glow-soft)",
  };

  // Staggered load animation for the form fields. Index drives the delay.
  const riseStyle = (i: number): React.CSSProperties => ({ animationDelay: `${i * 60}ms` });

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
          background: "var(--bg-base)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Soft radial glow behind the title */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "34%",
            left: "24%",
            width: 520,
            height: 520,
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, var(--accent-dim) 0%, transparent 62%)",
            pointerEvents: "none",
          }}
        />
        {/* Edge vignette for depth */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(120% 120% at 50% 40%, transparent 58%, rgba(0,0,0,0.55) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Centre content — nudged below true centre */}
        <div style={{ position: "relative", padding: "0 3.5rem", transform: "translateY(48px)" }}>
          <div className="label auth-rise" style={{ marginBottom: "var(--space-5)" }}>
            Your game library
          </div>

          <div
            className="auth-rise grad-text"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "3.75rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginBottom: "var(--space-6)",
              lineHeight: 1,
              ...riseStyle(1),
            }}
          >
            Shelved
          </div>

          <p
            className="auth-rise"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-lg)",
              color: "var(--text-secondary)",
              marginBottom: "var(--space-7)",
              lineHeight: 1.65,
              maxWidth: "34ch",
              ...riseStyle(2),
            }}
          >
            Track, rate, and discover games with your friends.
          </p>

          <ul
            className="auth-rise"
            style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-4)", ...riseStyle(3) }}
          >
            {[
              "Log every game you play",
              "Show off your top 3",
              "See what your friends are playing",
            ].map((text) => (
              <li
                key={text}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  display: "flex",
                  gap: "var(--space-3)",
                  alignItems: "center",
                  lineHeight: 1.5,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ flexShrink: 0 }}>
                  <path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Shelf — covers displayed on a divider line, fading off-screen */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "2.75rem",
            left: 0,
            right: 0,
            // Fade both edges so the library reads as continuing off-screen
            WebkitMaskImage: "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
            maskImage: "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "flex-end",
              padding: "0 3.5rem",
              // The shelf line the covers sit on
              borderBottom: "1px solid var(--border-strong)",
              paddingBottom: "0.6rem",
            }}
          >
            {COVER_IMAGES.map((cover) => (
              <div
                key={cover.id}
                className="auth-cover"
                style={{
                  width: 62,
                  flexShrink: 0,
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "0 6px 14px rgba(0,0,0,0.5)",
                }}
              >
                <GameCover name={cover.name} imageId={cover.id} size="cover_small" rounding="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* ── Right panel ── */}
      <div
        style={{
          flex: 1,
          background: "var(--bg-base)",
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "center",
          padding: isMobile ? "2.5rem 1.25rem" : "2rem",
          overflowY: "auto",
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* Compact wordmark replaces the hidden brand panel on mobile */}
          {isMobile && (
            <div
              className="grad-text"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-3xl)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                marginBottom: "var(--space-6)",
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
                background: "var(--accent-dim)",
                border: "1px solid var(--accent-ring)",
                borderRadius: "var(--radius-sm)",
                padding: "0.4rem 0.8rem",
                fontSize: 13,
                color: "var(--accent)",
                marginBottom: "1.5rem",
                textAlign: "center",
              }}
            >
              Sign in to continue
            </div>
          )}

          {/* Auth card — subtly lighter than the page */}
          <div
            className="auth-rise"
            style={{
              background: "var(--bg-card)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14,
              boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
              padding: isMobile ? "1.5rem 1.25rem" : "2rem",
            }}
          >
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: "1.5rem", marginBottom: "2rem" }}>
            {(["login", "signup"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchMode(tab)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: mode === tab ? "2px solid var(--accent)" : "2px solid transparent",
                  color: mode === tab ? "var(--text-primary)" : "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontWeight: mode === tab ? 600 : 400,
                  padding: "0 0 0.4rem",
                  transition: "color 0.15s, border-color 0.15s",
                  fontFamily: "var(--font-body)",
                }}
              >
                {tab === "login" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {/* ── Sign in ── */}
          {mode === "login" && (
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}
            >
              <input
                className="auth-input auth-rise"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ ...fieldStyle, ...riseStyle(1) }}
              />
              <input
                className="auth-input auth-rise"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ ...fieldStyle, ...riseStyle(2) }}
              />

              {error && (
                <p style={{ color: "var(--danger)", fontSize: "0.875rem", margin: 0 }}>{error}</p>
              )}

              <button
                className="auth-submit auth-rise"
                type="submit"
                disabled={loading}
                style={{ ...submitStyle, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              >
                {loading ? "Loading…" : "Sign in"}
              </button>
            </form>
          )}

          {/* ── Sign up · Step 1: email ── */}
          {mode === "signup" && signupStep === 1 && (
            <form
              onSubmit={handleEmailContinue}
              style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}
            >
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 0.25rem" }}>
                Step 1 of 2 · Your email
              </p>
              <input
                className="auth-input auth-rise"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                style={{ ...fieldStyle, ...riseStyle(1) }}
              />

              {error && (
                <p style={{ color: "var(--danger)", fontSize: "0.875rem", margin: 0 }}>{error}</p>
              )}

              <button className="auth-submit auth-rise" type="submit" style={submitStyle}>
                Continue
              </button>

              <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
                By signing up you agree to our Terms of Service
              </p>
            </form>
          )}

          {/* ── Sign up · Step 2: username + password ── */}
          {mode === "signup" && signupStep === 2 && (
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}
            >
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 0.25rem" }}>
                Step 2 of 2 · Pick a username &amp; password
              </p>
              <input
                className="auth-input auth-rise"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                style={{ ...fieldStyle, ...riseStyle(0) }}
              />
              <input
                className="auth-input auth-rise"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ ...fieldStyle, ...riseStyle(1) }}
              />
              <input
                className="auth-input auth-rise"
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ ...fieldStyle, ...riseStyle(2) }}
              />

              {error && (
                <p style={{ color: "var(--danger)", fontSize: "0.875rem", margin: 0 }}>{error}</p>
              )}

              {confirmationSent && (
                <p style={{ color: "var(--success)", fontSize: "0.875rem", margin: 0, lineHeight: 1.5 }}>
                  Check your email to confirm your account, then sign in.
                </p>
              )}

              {!confirmationSent && (
                <button
                  className="auth-submit auth-rise"
                  type="submit"
                  disabled={loading}
                  style={{ ...submitStyle, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
                >
                  {loading ? "Loading…" : "Create account"}
                </button>
              )}

              {!confirmationSent && (
                <button
                  type="button"
                  onClick={() => { setError(null); setSignupStep(1); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontFamily: "var(--font-body)",
                    padding: 0,
                  }}
                >
                  ← Back
                </button>
              )}
            </form>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
