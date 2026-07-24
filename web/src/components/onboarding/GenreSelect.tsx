import { GENRE_TAGS, GENRE_LABELS, MAX_GENRES } from "@gameboxd/lib";

interface GenreSelectProps {
  value: string[];
  onChange: (genres: string[]) => void;
}

/** Multi-select genre chips, capped at MAX_GENRES. Reused in onboarding and settings. */
export default function GenreSelect({ value, onChange }: GenreSelectProps) {
  const atMax = value.length >= MAX_GENRES;

  function toggle(tag: string) {
    if (value.includes(tag)) {
      onChange(value.filter((g) => g !== tag));
    } else if (!atMax) {
      onChange([...value, tag]);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
        {GENRE_TAGS.map((tag) => {
          const selected = value.includes(tag);
          const disabled = !selected && atMax;
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => toggle(tag)}
              style={{
                padding: "0.5rem 0.95rem",
                borderRadius: "999px",
                fontSize: "0.875rem",
                fontWeight: selected ? 600 : 400,
                fontFamily: "var(--font-body)",
                background: selected ? "var(--accent)" : "var(--bg-inset)",
                color: selected ? "var(--on-accent)" : "var(--text-secondary)",
                border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.4 : 1,
                transition: "background 0.12s, border-color 0.12s",
              }}
            >
              {GENRE_LABELS[tag]}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0.85rem 0 0" }}>
        {value.length}/{MAX_GENRES} selected{atMax ? " · max reached" : ""}
      </p>
    </div>
  );
}
