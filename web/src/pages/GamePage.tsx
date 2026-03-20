import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageSpinner } from "../components/Spinner";
import type { IGDBGame, GameLogRow, GameStatus } from "@gameboxd/lib";
import { getCoverUrl, getUserGameLogs, toggleLike, deleteGameLog } from "@gameboxd/lib";
import { getGame } from "../lib/igdb";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { useGamesStore } from "../store/games";

const STATUS_OPTIONS: { value: GameStatus; label: string }[] = [
  { value: "playing", label: "Playing" },
  { value: "completed", label: "Completed" },
  { value: "dropped", label: "Dropped" },
];

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const { userId } = useAuthStore();
  const { logGame } = useGamesStore();

  const [game, setGame] = useState<IGDBGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [existingLog, setExistingLog] = useState<GameLogRow | null>(null);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Want to Play (backlog) — stored as status="want_to_play", separate from the main log form
  const [wantToPlay, setWantToPlay] = useState(false);
  const [wtpSaving, setWtpSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [g, logs] = await Promise.all([
          getGame(Number(id)),
          userId ? getUserGameLogs(supabase, userId) : Promise.resolve<GameLogRow[]>([]),
        ]);
        if (cancelled) return;
        setGame(g);
        const log = logs.find((l) => l.game_igdb_id === Number(id)) ?? null;
        if (log) {
          setExistingLog(log);
          if (log.status === "want_to_play") {
            setWantToPlay(true);
            // Keep form defaulting to "playing" so they can upgrade easily
          } else {
            setStatus(log.status);
            setRating(log.rating);
            setReview(log.review ?? "");
          }
          setIsLiked(log.is_liked);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load game");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, userId]);

  const handleWantToPlay = async () => {
    if (!userId || !game) return;
    setWtpSaving(true);
    try {
      if (wantToPlay) {
        // Remove from backlog
        await deleteGameLog(supabase, userId, game.id);
        setExistingLog(null);
        setWantToPlay(false);
      } else {
        // Add to backlog
        const log = await logGame(game.id, "want_to_play");
        setExistingLog({ ...log, is_liked: isLiked });
        setWantToPlay(true);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setWtpSaving(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !game) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      // Enforce 5-like max
      if (isLiked && !existingLog?.is_liked) {
        const logs = await getUserGameLogs(supabase, userId);
        const likeCount = logs.filter((l) => l.is_liked && l.game_igdb_id !== game.id).length;
        if (likeCount >= 5) {
          setSaveError("You already have 5 liked games. Unlike one first.");
          setSaving(false);
          return;
        }
      }
      const log = await logGame(game.id, status, rating, review.trim() || null);
      try {
        await toggleLike(supabase, userId, game.id, isLiked);
      } catch {
        // is_liked column may not be migrated yet — log still saved
      }
      setExistingLog({ ...log, is_liked: isLiked });
      setWantToPlay(false); // upgrading from backlog to real log
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSpinner />;
  if (error) return <div style={{ padding: "2rem", color: "#f55" }}>{error}</div>;
  if (!game) return null;

  const year = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null;
  const developer = game.involved_companies?.find((c) => c.developer)?.company.name ?? null;
  const coverUrl = game.cover ? getCoverUrl(game.cover.image_id, "cover_big") : null;

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{ position: "relative", height: 340, overflow: "hidden" }}>
        {/* Blurred background */}
        {coverUrl && (
          <img
            src={coverUrl}
            alt=""
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "blur(22px) brightness(0.35)",
              transform: "scale(1.12)",
            }}
          />
        )}
        {/* Gradient fade to page bg */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 30%, var(--bg) 100%)",
          }}
        />
        {/* Content anchored to bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            maxWidth: 960,
            margin: "0 auto",
            padding: "0 2rem 1.75rem",
            display: "flex",
            gap: "1.5rem",
            alignItems: "flex-end",
          }}
        >
          {coverUrl && (
            <img
              src={coverUrl}
              alt={game.name}
              style={{
                width: 115,
                borderRadius: 8,
                flexShrink: 0,
                boxShadow: "0 6px 24px rgba(0,0,0,0.7)",
              }}
            />
          )}
          <div>
            <h1 style={{ fontSize: "1.9rem", fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
              {game.name}
            </h1>
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
              {year && <span style={{ color: "var(--muted)", fontSize: "0.95rem" }}>{year}</span>}
              {developer && (
                <span style={{ color: "var(--muted)", fontSize: "0.95rem" }}>· {developer}</span>
              )}
              {game.rating != null && (
                <span style={{ color: "var(--accent)", fontSize: "0.9rem" }}>
                  · ★ {game.rating.toFixed(0)}/100
                  {game.rating_count != null && (
                    <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {" "}({game.rating_count.toLocaleString()} ratings)
                    </span>
                  )}
                </span>
              )}
            </div>
            {game.genres && game.genres.length > 0 && (
              <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                {game.genres.map((g) => (
                  <span
                    key={g.id}
                    style={{
                      padding: "0.15rem 0.55rem",
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: 20,
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                    }}
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 2rem 4rem" }}>
        <div style={{ display: "flex", gap: "2.5rem", alignItems: "flex-start" }}>
          {/* Left: description + platforms */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {game.summary && (
              <p style={{ fontSize: "0.95rem", color: "var(--text)", lineHeight: 1.75, marginBottom: "1.25rem" }}>
                {game.summary}
              </p>
            )}
            {game.platforms && game.platforms.length > 0 && (
              <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                {game.platforms.map((p) => p.name).join(" · ")}
              </p>
            )}
          </div>

          {/* Right: log panel */}
          {userId && (
            <div
              style={{
                width: 270,
                flexShrink: 0,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>
                {existingLog && existingLog.status !== "want_to_play" ? "Your Log" : "Log This Game"}
              </h3>

              {/* Want to Play button — only when not yet properly logged */}
              {(!existingLog || existingLog.status === "want_to_play") && (
                <button
                  onClick={handleWantToPlay}
                  disabled={wtpSaving}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    padding: "0.5rem",
                    background: wantToPlay ? "rgba(108,99,255,0.12)" : "var(--bg)",
                    border: `1px solid ${wantToPlay ? "var(--accent)" : "var(--border)"}`,
                    color: wantToPlay ? "var(--accent)" : "var(--muted)",
                    borderRadius: 6,
                    cursor: wtpSaving ? "not-allowed" : "pointer",
                    fontSize: "0.875rem",
                    fontWeight: wantToPlay ? 600 : 400,
                    opacity: wtpSaving ? 0.7 : 1,
                  }}
                >
                  {wantToPlay ? "✓ Want to Play" : "+ Want to Play"}
                </button>
              )}

              {/* Divider before log form */}
              <div style={{ height: 1, background: "var(--border)", margin: "0 -1.25rem" }} />

              {/* Status */}
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: 5 }}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as GameStatus)}
                  style={{
                    width: "100%",
                    padding: "0.45rem 0.6rem",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    borderRadius: 6,
                    fontSize: "0.9rem",
                  }}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Rating */}
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: 5 }}>
                  Your Rating {rating ? `(${rating}/10)` : "(none)"}
                </label>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(rating === n ? null : n)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 5,
                        border: "1px solid var(--border)",
                        background: rating === n ? "var(--accent)" : "var(--bg)",
                        color: rating === n ? "#fff" : "var(--muted)",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        fontWeight: rating === n ? 700 : 400,
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review */}
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: 5 }}>
                  Review (optional)
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Your thoughts..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.4rem 0.6rem",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    borderRadius: 6,
                    fontSize: "0.85rem",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Like toggle */}
              <button
                onClick={() => setIsLiked((f) => !f)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.45rem",
                  background: isLiked ? "rgba(255,60,100,0.12)" : "var(--bg)",
                  border: `1px solid ${isLiked ? "rgba(255,60,100,0.45)" : "var(--border)"}`,
                  color: isLiked ? "#ff3c64" : "var(--muted)",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: isLiked ? 600 : 400,
                }}
              >
                {isLiked ? "♥ Liked" : "♡ Like"}
              </button>

              {saveError && <p style={{ color: "#f55", fontSize: "0.8rem", margin: 0 }}>{saveError}</p>}
              {saveSuccess && <p style={{ color: "#5c5", fontSize: "0.8rem", margin: 0 }}>Saved!</p>}

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "0.6rem",
                  background: "var(--accent)",
                  border: "none",
                  color: "#fff",
                  borderRadius: 6,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : existingLog ? "Update Log" : "Save Log"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
