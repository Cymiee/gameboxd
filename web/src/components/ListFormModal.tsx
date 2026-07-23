import { useState } from "react";

interface Props {
  /** Present when editing; absent when creating. */
  initial?: { title: string; description: string | null };
  onClose: () => void;
  onSave: (title: string, description: string | null) => Promise<void>;
}

/** Create or edit a list. Title required, description optional. */
export default function ListFormModal({ initial, onClose, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = initial !== undefined;

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("A title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed, description.trim() || null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

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
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          width: "min(460px, 100%)",
          maxHeight: "90dvh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          {isEdit ? "Edit list" : "New list"}
        </h2>

        <div>
          <label className="label" style={{ display: "block", marginBottom: "var(--space-2)" }}>
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cozy games for winter"
            autoFocus
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="label" style={{ display: "block", marginBottom: "var(--space-2)" }}>
            Description <span style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What ties these games together?"
            rows={3}
            style={{ ...fieldStyle, resize: "vertical", fontFamily: "var(--font-body)", lineHeight: 1.6 }}
          />
        </div>

        {error && <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>}

        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={secondaryBtn}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create list"}
          </button>
        </div>
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-3)",
  background: "var(--bg-inset)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  borderRadius: "var(--radius-sm)",
  fontSize: "var(--text-sm)",
  outline: "none",
  boxSizing: "border-box",
};

const secondaryBtn: React.CSSProperties = {
  padding: "0.6rem 1.25rem",
  background: "none",
  border: "1px solid var(--border)",
  color: "var(--text-secondary)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontSize: "var(--text-sm)",
};

const primaryBtn: React.CSSProperties = {
  padding: "0.6rem 1.5rem",
  background: "var(--accent)",
  border: "none",
  color: "var(--on-accent)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
};
