import { AVATAR_PRESETS } from "@gameboxd/lib";

interface AvatarSelectProps {
  value: string | null;
  onChange: (avatarId: string) => void;
}

/** Single-select grid of preset avatars. Reused in onboarding and settings. */
export default function AvatarSelect({ value, onChange }: AvatarSelectProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Choose an avatar"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
        gap: "0.75rem",
      }}
    >
      {AVATAR_PRESETS.map((preset) => {
        const selected = value === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={preset.id}
            onClick={() => onChange(preset.id)}
            style={{
              aspectRatio: "1 / 1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
              background: `${preset.color}22`,
              border: `2px solid ${selected ? preset.color : "var(--border)"}`,
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              transition: "border-color 0.12s, transform 0.12s",
              transform: selected ? "scale(1.04)" : "none",
              boxShadow: selected ? `0 0 0 3px ${preset.color}33` : "none",
            }}
          >
            <span aria-hidden>{preset.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}
