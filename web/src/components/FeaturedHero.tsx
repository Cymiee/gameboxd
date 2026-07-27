import { Link } from "react-router-dom";
import type { IGDBGame } from "@gameboxd/lib";
import { useIsMobile } from "../hooks/useIsMobile";

interface Props {
  game: IGDBGame;
  ctaLabel: string;
  ctaTo: string;
}

/** First sentence of a summary, trimmed to a tagline length. */
function tagline(summary: string | null): string | null {
  if (!summary) return null;
  const first = summary.split(/(?<=[.!?])\s/)[0] ?? summary;
  return first.length > 160 ? `${first.slice(0, 157).trimEnd()}…` : first;
}

/**
 * Netflix-style featured hero: large artwork that fades into the page, with
 * minimal overlaid UI — game name, one-line tagline, and a single CTA.
 */
export default function FeaturedHero({ game, ctaLabel, ctaTo }: Props) {
  const isMobile = useIsMobile();

  const artId = game.artworks?.[0]?.image_id ?? game.screenshots?.[0]?.image_id ?? game.cover?.image_id;
  const bg = artId ? `https://images.igdb.com/igdb/image/upload/t_1080p/${artId}.jpg` : null;
  const line = tagline(game.summary);

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        height: isMobile ? "66vh" : "78vh",
        minHeight: isMobile ? 380 : 460,
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      {bg && (
        <img
          src={bg}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            // Slow drift so the still image feels alive.
            animation: "auroraDrift 26s ease-in-out infinite",
          }}
        />
      )}

      {/* Cinematic scrims — everything fades into the page background */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, var(--bg-base) 1%, rgba(14,13,12,0.55) 32%, rgba(14,13,12,0.1) 68%), " +
            "linear-gradient(to right, rgba(14,13,12,0.9) 0%, rgba(14,13,12,0.35) 45%, transparent 70%)",
        }}
      />

      <div
        className="reveal"
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
          padding: isMobile ? "0 16px 2.25rem" : "0 24px 4rem",
        }}
      >
        <div className="label" style={{ marginBottom: "var(--space-3)", color: "var(--accent)" }}>
          Featured
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: isMobile ? "2.5rem" : "clamp(3rem, 6vw, 5rem)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.02,
            color: "#fff",
            margin: 0,
            maxWidth: "16ch",
            textShadow: "0 2px 30px rgba(0,0,0,0.6)",
          }}
        >
          {game.name}
        </h1>
        {line && (
          <p
            style={{
              marginTop: "var(--space-4)",
              fontSize: isMobile ? "var(--text-base)" : "var(--text-lg)",
              color: "rgba(245,243,240,0.85)",
              lineHeight: 1.55,
              maxWidth: "46ch",
              textShadow: "0 1px 12px rgba(0,0,0,0.6)",
            }}
          >
            {line}
          </p>
        )}
        <div style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <Link
            className="press"
            to={ctaTo}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.8rem 1.9rem",
              background: "var(--text-primary)",
              color: "var(--bg-base)",
              borderRadius: "var(--radius-sm)",
              fontWeight: 700,
              fontSize: "var(--text-base)",
              fontFamily: "var(--font-body)",
              textDecoration: "none",
              boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
              transition: "transform var(--transition), filter var(--transition)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.92)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
          >
            {ctaLabel}
          </Link>
          <Link
            className="press"
            to={`/game/${game.id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.8rem 1.6rem",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
              fontSize: "var(--text-base)",
              fontFamily: "var(--font-body)",
              textDecoration: "none",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              transition: "background var(--transition), border-color var(--transition)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.16)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; }}
          >
            More Info
          </Link>
        </div>
      </div>
    </section>
  );
}
