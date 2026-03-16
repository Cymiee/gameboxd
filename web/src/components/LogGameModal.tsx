import { useState } from "react";
import type { IGDBGame, GameLogRow, GameStatus } from "@gameboxd/lib";
import { getCoverUrl } from "@gameboxd/lib";

interface Props {
  game: IGDBGame;
  existingLog?: GameLogRow;
  onClose: () => void;
  onSave: (status: GameStatus, rating?: number | null, review?: string | null) => Promise<void>;
}

const STATUS_OPTIONS: { value: GameStatus; label: string }[] = [
  { value: "playing", label: "Playing" },
  { value: "completed", label: "Completed" },
  { value: "dropped", label: "Dropped" },
  { value: "want_to_play", label: "Want to Play" },
];

export default function LogGameModal({ game, existingLog, onClose, onSave }: Props) {
  const [status, setStatus] = useState<GameStatus>(existingLog?.status ?? "playing");
  const [rating, setRating] = useState<number | null>(existingLog?.rating ?? null);
  const [review, setReview] = useState(existingLog?.review ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(status, rating, review.trim() || null);
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
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1.5rem",
          width: "min(480px, 90vw)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          {game.cover && (
            <img
              src={getCoverUrl(game.cover.image_id, "cover_small")}
              alt={game.name}
              style={{ width: 60, borderRadius: 4, flexShrink: 0 }}
            />
          )}
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{game.name}</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 4 }}>
              {existingLog ? "Update your log" : "Log this game"}
            </p>
          </div>
        </div>

        {/* Status */}
        <div>
          <label style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block", marginBottom: 6 }}>
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as GameStatus)}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: 6,
              fontSize: "0.9rem",
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Rating */}
        <div>
          <label style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block", marginBottom: 6 }}>
            Rating {rating ? `(${rating}/10)` : "(none)"}
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setRating(rating === n ? null : n)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: rating === n ? "var(--accent)" : "var(--bg)",
                  color: rating === n ? "#fff" : "var(--muted)",
                  cursor: "pointer",
                  fontWeight: rating === n ? 700 : 400,
                  fontSize: "0.85rem",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Review */}
        <div>
          <label style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block", marginBottom: 6 }}>
            Review (optional)
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Write your thoughts..."
            rows={3}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: 6,
              fontSize: "0.9rem",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>

        {error && <p style={{ color: "#f55", fontSize: "0.85rem" }}>{error}</p>}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1.25rem",
              background: "none",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "0.5rem 1.25rem",
              background: "var(--accent)",
              border: "none",
              color: "#fff",
              borderRadius: 6,
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "0.9rem",
              fontWeight: 600,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
