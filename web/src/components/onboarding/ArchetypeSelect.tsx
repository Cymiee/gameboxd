import { ARCHETYPES, MAX_ARCHETYPES } from "@gameboxd/lib";

interface ArchetypeSelectProps {
  value: string[];
  onChange: (archetypes: string[]) => void;
}

/** Multi-select archetype cards (icon + label + flavor), capped at MAX_ARCHETYPES. */
export default function ArchetypeSelect({ value, onChange }: ArchetypeSelectProps) {
  const atMax = value.length >= MAX_ARCHETYPES;

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((a) => a !== id));
    } else if (!atMax) {
      onChange([...value, id]);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
          gap: "0.75rem",
        }}
      >
        {ARCHETYPES.map((arch) => {
          const selected = value.includes(arch.id);
          const disabled = !selected && atMax;
          return (
            <button
              key={arch.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => toggle(arch.id)}
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start",
                textAlign: "left",
                padding: "0.9rem 1rem",
                borderRadius: "var(--radius-md)",
                background: selected ? "var(--accent-dim)" : "var(--bg-inset)",
                border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.4 : 1,
                transition: "background 0.12s, border-color 0.12s",
                fontFamily: "var(--font-body)",
              }}
            >
              <span aria-hidden style={{ fontSize: "1.5rem", lineHeight: 1, flexShrink: 0 }}>
                {arch.emoji}
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: "0.2rem", minWidth: 0 }}>
                <span
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: selected ? "var(--accent)" : "var(--text-primary)",
                  }}
                >
                  {arch.label}
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  {arch.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0.85rem 0 0" }}>
        {value.length}/{MAX_ARCHETYPES} selected{atMax ? " · max reached" : ""}
      </p>
    </div>
  );
}
