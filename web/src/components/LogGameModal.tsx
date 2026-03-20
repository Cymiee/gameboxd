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
        background: "rgba(0,0,0,0.7)",
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
          width: "min(500px, 92vw)",
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
              style={{ width: 56, borderRadius: 6, flexShrink: 0 }}
            />
          )}
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, fontFamily: "Syne, sans-serif" }}>
              {game.name}
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 3 }}>
              {existingLog ? "Update your log" : "Log this game"}
            </p>
          </div>
        </div>

        {/* Status pills */}
        <div>
          <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Status
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                style={{
                  padding: "0.35rem 0.9rem",
                  borderRadius: 999,
                  border: `1px solid ${status === opt.value ? "var(--accent)" : "var(--border)"}`,
                  background: status === opt.value ? "var(--accent)" : "transparent",
                  color: status === opt.value ? "#0e0e10" : "var(--muted)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: status === opt.value ? 600 : 400,
                  transition: "all 0.12s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rating row */}
        <div>
          <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Rating {rating ? `· ${rating}/10` : "· none"}
          </label>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setRating(rating === n ? null : n)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  border: `1px solid ${rating === n ? "var(--accent)" : "var(--border)"}`,
                  background: rating === n ? "var(--accent)" : "var(--bg)",
                  color: rating === n ? "#0e0e10" : "var(--muted)",
                  cursor: "pointer",
                  fontWeight: rating === n ? 700 : 400,
                  fontSize: "0.85rem",
                  transition: "all 0.1s",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Review */}
        <div>
          <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Review
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="What did you think?"
            rows={4}
            style={{
              width: "100%",
              padding: "0.6rem 0.75rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: 8,
              fontSize: "0.9rem",
              resize: "vertical",
              fontFamily: "Inter, sans-serif",
              lineHeight: 1.5,
            }}
          />
        </div>

        {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.55rem 1.25rem",
              background: "none",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              borderRadius: 8,
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
              padding: "0.55rem 1.5rem",
              background: "var(--accent)",
              border: "none",
              color: "#0e0e10",
              borderRadius: 8,
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "0.9rem",
              fontWeight: 700,
              opacity: saving ? 0.7 : 1,
              fontFamily: "Syne, sans-serif",
            }}
          >
            {saving ? "Saving..." : existingLog ? "Update log" : "Save to log"}
          </button>
        </div>
      </div>
    </div>
  );
}
