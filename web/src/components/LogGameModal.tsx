import { useState } from "react";
import type { IGDBGame, GameLogRow, GameStatus } from "@gameboxd/lib";
import GameCover from "./GameCover";
import { STATUS_META, STATUS_ORDER } from "../theme";

interface Props {
  game: IGDBGame;
  existingLog?: GameLogRow;
  onClose: () => void;
  onSave: (status: GameStatus, rating?: number | null, review?: string | null, playtimeMin?: number | null) => Promise<void>;
}

export default function LogGameModal({ game, existingLog, onClose, onSave }: Props) {
  const [status, setStatus] = useState<GameStatus>(existingLog?.status ?? "playing");
  const [rating, setRating] = useState<number | null>(existingLog?.rating ?? null);
  const [review, setReview] = useState(existingLog?.review ?? "");
  const [hours, setHours] = useState(
    existingLog?.playtime_min != null ? String(+(existingLog.playtime_min / 60).toFixed(1)) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track whether the user picked a status themselves, so we only auto-assume.
  const [statusTouched, setStatusTouched] = useState(false);
  // Only write hours if the user actually changed the field (preserves exact
  // Steam minutes when they don't touch it).
  const [hoursTouched, setHoursTouched] = useState(false);

  const pickStatus = (value: GameStatus) => {
    setStatus(value);
    setStatusTouched(true);
  };

  const pickRating = (n: number) => {
    const next = rating === n ? null : n;
    setRating(next);
    // Rating a game implies you've played it — assume "completed" so users
    // back-logging past games don't have to set status every time. Only when
    // logging fresh and the user hasn't chosen a status themselves.
    if (next != null && !statusTouched && !existingLog) {
      setStatus("completed");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    // Convert the hours field to minutes only if the user edited it.
    let playtimeMin: number | null | undefined = undefined;
    if (hoursTouched) {
      const t = hours.trim();
      if (t === "") playtimeMin = null;
      else {
        const h = parseFloat(t);
        playtimeMin = Number.isFinite(h) ? Math.max(0, Math.round(h * 60)) : undefined;
      }
    }
    try {
      await onSave(status, rating, review.trim() || null, playtimeMin);
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
          width: "min(500px, 100%)",
          maxHeight: "90dvh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-start" }}>
          <div style={{ width: 58, flexShrink: 0 }}>
            <GameCover
              name={game.name}
              imageId={game.cover?.image_id}
              size="cover_small"
              rounding="md"
            />
          </div>
          <div>
            <h2
              style={{
                fontSize: "var(--text-xl)",
                fontWeight: 600,
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.01em",
                lineHeight: 1.25,
              }}
            >
              {game.name}
            </h2>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>
              {existingLog ? "Update your log" : "Log this game"}
            </p>
          </div>
        </div>

        {/* Status pills — each carries its own semantic hue */}
        <div>
          <label className="label" style={{ display: "block", marginBottom: "var(--space-3)" }}>
            Status
          </label>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {STATUS_ORDER.map((value) => {
              const meta = STATUS_META[value];
              const active = status === value;
              return (
                <button
                  key={value}
                  onClick={() => pickStatus(value)}
                  style={{
                    padding: "0.4rem 0.95rem",
                    borderRadius: "var(--radius-full)",
                    border: `1px solid ${active ? meta.color : "var(--border)"}`,
                    background: active ? meta.dim : "transparent",
                    color: active ? meta.color : "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "var(--text-sm)",
                    fontWeight: active ? 600 : 400,
                    transition: "all var(--transition)",
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rating row */}
        <div>
          <label className="label" style={{ display: "block", marginBottom: "var(--space-3)" }}>
            Rating {rating ? `· ${rating}/10` : "· none"}
          </label>
          <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => pickRating(n)}
                aria-label={`Rate ${n} out of 10`}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${rating === n ? "var(--accent)" : "var(--border)"}`,
                  background: rating === n ? "var(--accent)" : "var(--bg-inset)",
                  color: rating === n ? "var(--on-accent)" : "var(--text-muted)",
                  cursor: "pointer",
                  fontWeight: rating === n ? 600 : 400,
                  fontSize: "var(--text-sm)",
                  fontVariantNumeric: "tabular-nums",
                  transition: "all var(--transition)",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Hours played */}
        <div>
          <label className="label" style={{ display: "block", marginBottom: "var(--space-3)" }}>
            Hours played
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            value={hours}
            onChange={(e) => { setHours(e.target.value); setHoursTouched(true); }}
            placeholder="e.g. 42"
            style={{
              width: 140,
              padding: "0.5rem 0.75rem",
              background: "var(--bg-inset)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-sm)",
              outline: "none",
              fontFamily: "var(--font-body)",
              fontVariantNumeric: "tabular-nums",
            }}
          />
          {existingLog?.playtime_min != null && !existingLog.playtime_manual && (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "0.4rem 0 0" }}>
              From Steam — edit to include other platforms.
            </p>
          )}
        </div>

        {/* Review */}
        <div>
          <label className="label" style={{ display: "block", marginBottom: "var(--space-3)" }}>
            Review
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="What did you think?"
            rows={4}
            style={{
              width: "100%",
              padding: "var(--space-3)",
              background: "var(--bg-inset)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-sm)",
              resize: "vertical",
              fontFamily: "var(--font-body)",
              lineHeight: 1.6,
            }}
          />
        </div>

        {error && <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)" }}>{error}</p>}

        {/* Actions */}
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.6rem 1.25rem",
              background: "none",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontSize: "var(--text-sm)",
            }}
          >
            Cancel
          </button>
          <button
            className="press"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "0.6rem 1.5rem",
              background: "var(--grad-brand)",
              border: "none",
              color: "var(--on-accent)",
              borderRadius: "var(--radius-sm)",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              opacity: saving ? 0.7 : 1,
              fontFamily: "var(--font-body)",
              boxShadow: saving ? "none" : "var(--glow-soft)",
            }}
          >
            {saving ? "Saving..." : existingLog ? "Update log" : "Save to log"}
          </button>
        </div>
      </div>
    </div>
  );
}
