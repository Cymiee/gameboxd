import { useEffect, useState } from "react";
import type { UserRow } from "@gameboxd/lib";
import { updateProfile, upsertProfileTags } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import AvatarSelect from "./onboarding/AvatarSelect";
import { presetAvatarUrl } from "./Avatar";

interface Props {
  userId: string;
  currentAvatarId: string | null;
  onClose: () => void;
  onSaved: (profile: UserRow, avatarId: string) => void;
}

/** Quick avatar picker — writes both the display avatar_url and the tag avatar_id. */
export default function AvatarPickerModal({ userId, currentAvatarId, onClose, onSaved }: Props) {
  const [selected, setSelected] = useState<string | null>(currentAvatarId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile(supabase, userId, { avatar_url: presetAvatarUrl(selected) });
      await upsertProfileTags(supabase, userId, { avatar_id: selected });
      onSaved(updated, selected);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save avatar.");
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 300,
      }}
    >
      <div
        className="reveal-pop"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          width: "min(440px, 100%)",
          boxShadow: "var(--shadow-modal)",
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
          animationDuration: "200ms",
        }}
      >
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, margin: 0 }}>
          Choose your avatar
        </h2>

        <AvatarSelect value={selected} onChange={setSelected} />

        {error && <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.55rem 1.1rem",
              background: "none",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font-body)",
            }}
          >
            Cancel
          </button>
          <button
            className="press"
            disabled={saving || !selected || selected === currentAvatarId}
            onClick={save}
            style={{
              padding: "0.55rem 1.35rem",
              background: "var(--accent)",
              border: "none",
              color: "var(--on-accent)",
              borderRadius: "var(--radius-sm)",
              cursor: saving || !selected || selected === currentAvatarId ? "not-allowed" : "pointer",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              opacity: saving || !selected || selected === currentAvatarId ? 0.5 : 1,
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
