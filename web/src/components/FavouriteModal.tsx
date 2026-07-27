import { useEffect, useState } from "react";
import type { IGDBGame } from "@gameboxd/lib";
import { getGames } from "../lib/igdb";
import { useGamesStore } from "../store/games";
import GameCover from "./GameCover";
import { StarIcon, CloseIcon } from "./icons";

const POSITIONS: (1 | 2 | 3)[] = [1, 2, 3];

/**
 * Add a game to the user's favourites (top 3). If all three slots are full,
 * each favourite shows an ✕ to replace it with the current game.
 */
export default function FavouriteModal({ game, onClose }: { game: IGDBGame; onClose: () => void }) {
  const { topGames, fetchTopGames, setTopGame, removeTopGame } = useGamesStore();
  const [covers, setCovers] = useState<Map<number, IGDBGame>>(new Map());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void fetchTopGames(); }, [fetchTopGames]);

  // Escape closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Cover art for the current favourites
  useEffect(() => {
    const ids = topGames.map((t) => t.game_igdb_id);
    if (ids.length === 0) { setCovers(new Map()); return; }
    getGames(ids).then((gs) => setCovers(new Map(gs.map((g) => [g.id, g])))).catch(() => {});
  }, [topGames]);

  const byPos = new Map(topGames.map((t) => [t.position, t]));
  const alreadyFav = topGames.find((t) => t.game_igdb_id === game.id) ?? null;
  const usedPositions = topGames.map((t) => t.position);
  const freePos = POSITIONS.find((p) => !usedPositions.includes(p)) ?? null;
  const isFull = topGames.length >= 3;

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  const addAt = (pos: 1 | 2 | 3) => run(() => setTopGame(pos, game.id));
  const removeSelf = () => (alreadyFav ? run(() => removeTopGame(alreadyFav.position)) : undefined);

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
          width: "min(460px, 100%)",
          boxShadow: "var(--shadow-modal)",
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
          animationDuration: "200ms",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <StarIcon size={20} color="var(--accent)" filled />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, margin: 0 }}>
            {alreadyFav ? "In your favourites" : "Add to Favourites"}
          </h2>
        </div>

        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          {alreadyFav
            ? `${game.name} is pinned to your profile.`
            : isFull
              ? `Your favourites are full. Tap ✕ on one to replace it with ${game.name}.`
              : `Pin ${game.name} to your profile — up to 3 favourites.`}
        </p>

        {/* Three slots */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
          {POSITIONS.map((pos) => {
            const entry = byPos.get(pos);
            const g = entry ? covers.get(entry.game_igdb_id) : null;
            const isThisGame = entry?.game_igdb_id === game.id;

            // Empty slot → add here
            if (!entry) {
              return (
                <button
                  key={pos}
                  className="press"
                  disabled={busy}
                  onClick={() => addAt(pos)}
                  style={{
                    aspectRatio: "3 / 4",
                    borderRadius: "var(--radius-md)",
                    border: "1px dashed var(--border-strong)",
                    background: "var(--bg-inset)",
                    color: "var(--text-muted)",
                    cursor: busy ? "not-allowed" : "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    fontSize: "var(--text-xs)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <StarIcon size={20} color="var(--accent)" />
                  Add here
                </button>
              );
            }

            // Filled slot
            return (
              <div key={pos} style={{ position: "relative" }}>
                <div style={{ outline: isThisGame ? "2px solid var(--accent)" : "none", outlineOffset: 2, borderRadius: "var(--radius-md)" }}>
                  <GameCover name={g?.name ?? "Game"} imageId={g?.cover?.image_id} size="cover_small" rounding="md" />
                </div>
                {/* Replace (only when this isn't already the current game) */}
                {!isThisGame && (
                  <button
                    className="press"
                    disabled={busy}
                    aria-label={`Replace ${g?.name ?? "favourite"} with ${game.name}`}
                    title="Replace with this game"
                    onClick={() => addAt(pos)}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 24,
                      height: 24,
                      borderRadius: "var(--radius-full)",
                      background: "rgba(0,0,0,0.7)",
                      border: "1px solid var(--border-strong)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    <CloseIcon size={13} />
                  </button>
                )}
                {isThisGame && (
                  <div style={{ position: "absolute", top: 4, right: 4, background: "var(--accent)", color: "var(--on-accent)", borderRadius: "var(--radius-full)", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <StarIcon size={13} color="var(--on-accent)" filled />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>}

        {/* Footer action */}
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
            Close
          </button>
          {alreadyFav ? (
            <button
              className="press"
              disabled={busy}
              onClick={removeSelf}
              style={{
                padding: "0.55rem 1.25rem",
                background: "var(--danger)",
                border: "none",
                color: "#fff",
                borderRadius: "var(--radius-sm)",
                cursor: busy ? "not-allowed" : "pointer",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                opacity: busy ? 0.7 : 1,
              }}
            >
              Remove from favourites
            </button>
          ) : freePos ? (
            <button
              className="press"
              disabled={busy}
              onClick={() => addAt(freePos)}
              style={{
                padding: "0.55rem 1.25rem",
                background: "var(--accent)",
                border: "none",
                color: "var(--on-accent)",
                borderRadius: "var(--radius-sm)",
                cursor: busy ? "not-allowed" : "pointer",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                opacity: busy ? 0.7 : 1,
              }}
            >
              Add to Favourites
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
