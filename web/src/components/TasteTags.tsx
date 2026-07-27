import { Link } from "react-router-dom";
import type { UserProfileTagsRow } from "@gameboxd/lib";
import { ARCHETYPES, GENRE_LABELS } from "@gameboxd/lib";

const ARCH_BY_ID = new Map<string, (typeof ARCHETYPES)[number]>(ARCHETYPES.map((a) => [a.id, a]));
const genreLabel = (g: string) => GENRE_LABELS[g as keyof typeof GENRE_LABELS] ?? g;

interface Props {
  tags: UserProfileTagsRow | null;
  /** The signed-in user's tags — enables the "you both love…" highlight. */
  viewerTags?: UserProfileTagsRow | null;
  isOwn?: boolean;
}

/**
 * A profile's gaming "taste": archetype badges + favourite-genre chips, plus a
 * shared-taste callout when a signed-in viewer looks at someone else.
 */
export default function TasteTags({ tags, viewerTags, isOwn = false }: Props) {
  const archetypes = tags?.archetypes ?? [];
  const genres = tags?.genres ?? [];

  if (archetypes.length === 0 && genres.length === 0) {
    return isOwn ? (
      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
        Add your gaming style in <Link to="/settings" style={{ color: "var(--accent)" }}>settings</Link>.
      </p>
    ) : null;
  }

  // Shared taste (only when viewing someone else with a known viewer)
  const shared = viewerTags && !isOwn
    ? [
        ...archetypes.filter((a) => viewerTags.archetypes.includes(a)).map((a) => ARCH_BY_ID.get(a)?.label ?? a),
        ...genres.filter((g) => viewerTags.genres.includes(g)).map(genreLabel),
      ]
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {shared.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "baseline",
            flexWrap: "wrap",
            padding: "0.6rem 0.8rem",
            background: "var(--accent-dim)",
            border: "1px solid var(--accent-ring)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            You both love
          </span>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
            {shared.slice(0, 3).join(" · ")}
          </span>
        </div>
      )}

      {archetypes.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {archetypes.map((id) => {
            const meta = ARCH_BY_ID.get(id);
            if (!meta) return null;
            return (
              <span
                key={id}
                title={meta.description}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.35rem 0.7rem",
                  borderRadius: "var(--radius-full)",
                  background: "var(--bg-inset)",
                  border: "1px solid var(--border-strong)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                <span aria-hidden style={{ fontSize: "0.95rem", lineHeight: 1 }}>{meta.emoji}</span>
                {meta.label}
              </span>
            );
          })}
        </div>
      )}

      {genres.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
          {genres.map((g) => (
            <span
              key={g}
              style={{
                padding: "3px 10px",
                borderRadius: "var(--radius-full)",
                background: "transparent",
                border: "1px solid var(--border)",
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              {genreLabel(g)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
