import { AVATAR_PRESETS, dicebearAvatarUrl } from "@gameboxd/lib";

interface AvatarSelectProps {
  value: string | null;
  onChange: (avatarId: string) => void;
}

/** Single-select grid of preset DiceBear avatars. Reused in onboarding and settings. */
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
            aria-label={`Avatar ${preset.id}`}
            onClick={() => onChange(preset.id)}
            className="press"
            style={{
              aspectRatio: "1 / 1",
              padding: 0,
              overflow: "hidden",
              background: preset.color,
              border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              transition: "border-color 0.12s, transform 0.12s, box-shadow 0.12s",
              transform: selected ? "scale(1.04)" : "none",
              boxShadow: selected ? "var(--glow-accent)" : "none",
            }}
          >
            <img
              src={dicebearAvatarUrl(preset)}
              alt=""
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </button>
        );
      })}
    </div>
  );
}
