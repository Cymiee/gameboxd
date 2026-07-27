import { AVATAR_PRESETS, dicebearAvatarUrl } from "@gameboxd/lib";

const PRESET_PREFIX = "preset:";

interface AvatarProps {
  username: string;
  avatarUrl: string | null;
  size: number;
  /** Fallback initial styling. "dim" = accent-dim circle, "solid" = filled accent chip. */
  variant?: "dim" | "solid";
}

/** True when this avatar_url encodes one of our preset avatars. */
export function isPresetAvatar(avatarUrl: string | null | undefined): boolean {
  return !!avatarUrl && avatarUrl.startsWith(PRESET_PREFIX);
}

/** Build the avatar_url sentinel stored for a chosen preset. */
export function presetAvatarUrl(avatarId: string): string {
  return `${PRESET_PREFIX}${avatarId}`;
}

/** Extract the preset id from an avatar_url sentinel, or null if it isn't one. */
export function presetIdFromUrl(avatarUrl: string | null | undefined): string | null {
  return isPresetAvatar(avatarUrl) ? avatarUrl!.slice(PRESET_PREFIX.length) : null;
}

/**
 * Renders a user's avatar from their avatar_url, in priority order:
 * a chosen preset ("preset:<id>"), a real image URL, or a username-initial
 * fallback. Single source of truth so presets show everywhere.
 */
export default function Avatar({ username, avatarUrl, size, variant = "dim" }: AvatarProps) {
  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const presetId = presetIdFromUrl(avatarUrl);

  if (presetId) {
    const preset = AVATAR_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      return (
        <img
          src={dicebearAvatarUrl(preset)}
          alt={username}
          loading="lazy"
          style={{ ...base, background: preset.color, objectFit: "cover" }}
        />
      );
    }
    // Unknown/legacy preset id (e.g. the old emoji set) → fall through to initial.
  } else if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        style={{ ...base, objectFit: "cover", border: "1px solid var(--border)" }}
      />
    );
  }

  const solid = variant === "solid";
  return (
    <div
      style={{
        ...base,
        background: solid ? "var(--accent)" : "var(--accent-dim)",
        border: solid ? "none" : "1px solid var(--accent-ring)",
        color: solid ? "var(--on-accent)" : "var(--accent)",
        fontWeight: 600,
        fontSize: size * 0.42,
        fontFamily: "var(--font-display)",
      }}
    >
      {username[0]?.toUpperCase()}
    </div>
  );
}
