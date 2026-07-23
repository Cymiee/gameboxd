import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageSpinner } from "../components/Spinner";
import type { IGDBGame, GameLogRow, GameStatus, FriendRating } from "@gameboxd/lib";
import { getCoverUrl, getUserGameLogs, toggleLike, deleteGameLog, getFriendRatingsForGame } from "@gameboxd/lib";
import GameCover from "../components/GameCover";
import StatusChip from "../components/StatusChip";
import Shelf, { ShelfHeader } from "../components/Shelf";
import { getGame, getGames } from "../lib/igdb";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { useGamesStore } from "../store/games";
import LogGameModal from "../components/LogGameModal";
import AddToListModal from "../components/AddToListModal";
import GameCard from "../components/GameCard";
import { useIsMobile } from "../hooks/useIsMobile";

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const { userId } = useAuthStore();
  const { logGame } = useGamesStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [game, setGame] = useState<IGDBGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [existingLog, setExistingLog] = useState<GameLogRow | null>(null);
  const [wantToPlay, setWantToPlay] = useState(false);
  const [wtpSaving, setWtpSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showLogModal, setShowLogModal] = useState(false);
  const [showAddToList, setShowAddToList] = useState(false);

  const [friendRatings, setFriendRatings] = useState<FriendRating[]>([]);
  const [similarGames, setSimilarGames] = useState<IGDBGame[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    // Navigating between games (e.g. via "Similar Games") reuses this component
    // instance, so per-game state must be cleared or the previous game's log,
    // modal and ratings carry over. Resetting loading here also stops the old
    // game flashing for a frame before the new fetch resolves.
    setLoading(true);
    setExistingLog(null);
    setWantToPlay(false);
    setSaveError(null);
    setShowLogModal(false);
    setShowAddToList(false);
    setFriendRatings([]);
    setSimilarGames([]);

    async function load() {
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
          setWantToPlay(log.status === "want_to_play");
        }

        // Similar games
        if (g.similar_games && g.similar_games.length > 0) {
          const similar = await getGames(g.similar_games.slice(0, 6));
          if (!cancelled) setSimilarGames(similar);
        }

        // Friends' ratings
        if (userId) {
          const ratings = await getFriendRatingsForGame(supabase, userId, Number(id));
          if (!cancelled) setFriendRatings(ratings);
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
        await deleteGameLog(supabase, userId, game.id);
        setExistingLog(null);
        setWantToPlay(false);
      } else {
        const log = await logGame(game.id, "want_to_play");
        setExistingLog(log);
        setWantToPlay(true);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setWtpSaving(false);
    }
  };

  const handleSaveLog = async (status: GameStatus, rating?: number | null, review?: string | null) => {
    if (!userId || !game) return;
    setSaveError(null);

    if (existingLog?.is_liked) {
      const logs = await getUserGameLogs(supabase, userId);
      const likeCount = logs.filter((l) => l.is_liked && l.game_igdb_id !== game.id).length;
      if (likeCount >= 5) {
        throw new Error("You already have 5 liked games. Unlike one first.");
      }
    }

    const log = await logGame(game.id, status, rating, review);
    try {
      await toggleLike(supabase, userId, game.id, existingLog?.is_liked ?? false);
    } catch {
      // is_liked may not be migrated yet
    }
    setExistingLog({ ...log, is_liked: existingLog?.is_liked ?? false });
    setWantToPlay(false);
  };

  if (loading) return <PageSpinner />;
  if (error) return <div style={{ padding: "2rem", color: "var(--danger)" }}>{error}</div>;
  if (!game) return null;

  const year = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null;
  const developer = game.involved_companies?.find((c) => c.developer)?.company.name ?? null;
  const publisher = game.involved_companies?.find((c) => !c.developer)?.company.name ?? null;
  const coverUrl = game.cover ? getCoverUrl(game.cover.image_id, "cover_big") : null;
  const communityRating = game.rating != null ? (game.rating / 10).toFixed(1) : null;

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{ position: "relative", overflow: "hidden" }}>
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
              filter: "blur(40px) brightness(0.3)",
              transform: "scale(1.12)",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 40%, var(--bg-base) 100%)",
          }}
        />

        {/* Hero content centred; stacks vertically on mobile */}
        <div
          style={{
            position: "relative",
            minHeight: isMobile ? 0 : 420,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? "1.75rem 0 2rem" : 0,
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              width: "100%",
              padding: isMobile ? "0 16px" : "0 24px",
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: isMobile ? "1.25rem" : "2rem",
              alignItems: "center",
            }}
          >
            <div style={{ width: isMobile ? 150 : 200, flexShrink: 0 }}>
              <GameCover name={game.name} imageId={game.cover?.image_id} />
            </div>

            <div style={{ width: isMobile ? "100%" : "auto" }}>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.875rem, 3vw, 2.75rem)",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                  lineHeight: 1.12,
                  margin: 0,
                  marginBottom: "var(--space-3)",
                }}
              >
                {game.name}
              </h1>

              {game.genres && game.genres.length > 0 && (
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                  {game.genres.map((g) => (
                    <span
                      key={g.id}
                      style={{
                        padding: "3px 11px",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-full)",
                        fontSize: "var(--text-xs)",
                        fontWeight: 500,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap", marginBottom: "var(--space-4)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                {year && <span style={{ fontVariantNumeric: "tabular-nums" }}>{year}</span>}
                {year && game.platforms && game.platforms.length > 0 && <span aria-hidden>·</span>}
                {game.platforms && game.platforms.length > 0 && (
                  <span>{game.platforms.map((p) => p.name).join(", ")}</span>
                )}
              </div>

              {/* Existing log status reads as metadata here, not a second CTA */}
              {existingLog && (
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <StatusChip status={existingLog.status} />
                </div>
              )}

              {communityRating && (
                <div style={{ marginBottom: "var(--space-5)", display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-3xl)",
                      fontWeight: 600,
                      color: "var(--accent)",
                      lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {communityRating}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                    {game.rating_count != null && `${game.rating_count.toLocaleString()} ratings`}
                  </span>
                </div>
              )}

              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    if (userId) {
                      setShowLogModal(true);
                    } else {
                      navigate(`/auth?from=/game/${id}`);
                    }
                  }}
                  style={{
                    padding: "0.65rem 1.5rem",
                    background: "var(--accent)",
                    border: "none",
                    color: "var(--on-accent)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "var(--text-sm)",
                    fontFamily: "var(--font-body)",
                    transition: "background var(--transition)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
                >
                  {existingLog && existingLog.status !== "want_to_play" ? "Edit log" : "Log this game"}
                </button>

                {userId && (!existingLog || existingLog.status === "want_to_play") && (
                  <button
                    onClick={handleWantToPlay}
                    disabled={wtpSaving}
                    style={{
                      padding: "0.6rem 1.25rem",
                      background: wantToPlay ? "var(--accent-dim)" : "transparent",
                      border: `1px solid ${wantToPlay ? "var(--accent)" : "var(--border)"}`,
                      color: wantToPlay ? "var(--accent)" : "var(--text-muted)",
                      borderRadius: "var(--radius-sm)",
                      cursor: wtpSaving ? "not-allowed" : "pointer",
                      fontSize: "0.875rem",
                      fontWeight: wantToPlay ? 600 : 400,
                      opacity: wtpSaving ? 0.7 : 1,
                    }}
                  >
                    {wantToPlay ? "✓ Want to Play" : "+ Want to Play"}
                  </button>
                )}

                {userId && (
                  <button
                    onClick={() => setShowAddToList(true)}
                    style={{
                      padding: "0.6rem 1.25rem",
                      background: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                    }}
                  >
                    + Add to list
                  </button>
                )}
              </div>

              {saveError && <p style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "0.5rem" }}>{saveError}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "1.75rem 16px 3rem" : "2.5rem 24px 4rem" }}>

        {/* Friends' ratings strip — hidden entirely when no friends have rated */}
        {userId && friendRatings.length > 0 && (
          <section style={{ marginBottom: "var(--space-7)" }}>
            <ShelfHeader title="Friends Rated This" count={friendRatings.length} />
            {(
              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                {friendRatings.map((fr) => (
                  <div
                    key={fr.user.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      padding: "var(--space-2) var(--space-3)",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "var(--accent-dim)",
                        border: "1px solid var(--accent-ring)",
                        color: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 600,
                        fontSize: "var(--text-xs)",
                        fontFamily: "var(--font-display)",
                        flexShrink: 0,
                      }}
                    >
                      {fr.user.username[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>{fr.user.username}</span>
                    <span
                      style={{
                        background: "var(--accent-dim)",
                        color: "var(--accent)",
                        border: "1px solid var(--accent-ring)",
                        borderRadius: "var(--radius-full)",
                        fontSize: "var(--text-xs)",
                        fontWeight: 600,
                        padding: "1px 8px",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fr.rating}/10
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* About section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 300px",
            gap: isMobile ? "1.75rem" : "2.5rem",
            alignItems: "start",
          }}
        >
          <div>
            {game.summary && (
              <p style={{ fontSize: "var(--text-base)", color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "var(--space-6)", maxWidth: "68ch" }}>
                {game.summary}
              </p>
            )}

            <div style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap", marginBottom: "var(--space-6)" }}>
              {developer && (
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Developer</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{developer}</div>
                </div>
              )}
              {publisher && publisher !== developer && (
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Publisher</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{publisher}</div>
                </div>
              )}
              {year && (
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Released</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{year}</div>
                </div>
              )}
            </div>

            {game.platforms && game.platforms.length > 0 && (
              <div>
                <div className="label" style={{ marginBottom: "var(--space-2)" }}>Platforms</div>
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  {game.platforms.map((p) => (
                    <span
                      key={p.id}
                      style={{
                        padding: "3px 11px",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "var(--text-xs)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: user log state summary (read-only when logged) */}
          {existingLog && existingLog.status !== "want_to_play" && (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-5)",
              }}
            >
              <div className="label" style={{ marginBottom: "var(--space-3)" }}>
                Your Log
              </div>
              <div style={{ marginBottom: "var(--space-3)" }}>
                <StatusChip status={existingLog.status} />
              </div>
              {existingLog.rating != null && (
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-2xl)",
                    fontWeight: 600,
                    color: "var(--accent)",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  {existingLog.rating}
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontWeight: 400 }}>/10</span>
                </div>
              )}
              {existingLog.review && (
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: "var(--space-2)" }}>
                  {existingLog.review.length > 120 ? existingLog.review.slice(0, 120) + "…" : existingLog.review}
                </p>
              )}
              <button
                onClick={() => setShowLogModal(true)}
                style={{
                  marginTop: "var(--space-4)",
                  padding: "0.45rem 1rem",
                  background: "none",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontSize: "var(--text-xs)",
                  transition: "border-color var(--transition), color var(--transition)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-ring)";
                  e.currentTarget.style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Similar games */}
        {similarGames.length > 0 && (
          <div style={{ marginTop: "var(--space-8)" }}>
            <Shelf title="Similar Games" count={similarGames.length} itemWidth={isMobile ? 128 : 150}>
              {similarGames.map((g) => (
                <GameCard key={g.id} game={g} onSelect={(sg) => navigate(`/game/${sg.id}`)} />
              ))}
            </Shelf>
          </div>
        )}
      </div>

      {/* Log modal */}
      {showLogModal && game && (
        <LogGameModal
          game={game}
          {...(existingLog ? { existingLog } : {})}
          onClose={() => setShowLogModal(false)}
          onSave={handleSaveLog}
        />
      )}

      {showAddToList && userId && game && (
        <AddToListModal
          userId={userId}
          gameIgdbId={game.id}
          gameName={game.name}
          onClose={() => setShowAddToList(false)}
        />
      )}
    </div>
  );
}
