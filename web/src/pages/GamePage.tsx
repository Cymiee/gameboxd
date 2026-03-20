import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageSpinner } from "../components/Spinner";
import type { IGDBGame, GameLogRow, GameStatus, UserRow } from "@gameboxd/lib";
import { getCoverUrl, getUserGameLogs, toggleLike, deleteGameLog, getFriends } from "@gameboxd/lib";
import { getGame, getGames } from "../lib/igdb";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { useGamesStore } from "../store/games";
import LogGameModal from "../components/LogGameModal";
import GameCard from "../components/GameCard";

interface FriendRating {
  user: Pick<UserRow, "id" | "username">;
  rating: number;
}

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const { userId } = useAuthStore();
  const { logGame } = useGamesStore();
  const navigate = useNavigate();

  const [game, setGame] = useState<IGDBGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [existingLog, setExistingLog] = useState<GameLogRow | null>(null);
  const [wantToPlay, setWantToPlay] = useState(false);
  const [wtpSaving, setWtpSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showLogModal, setShowLogModal] = useState(false);

  const [friendRatings, setFriendRatings] = useState<FriendRating[]>([]);
  const [similarGames, setSimilarGames] = useState<IGDBGame[]>([]);

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
          setWantToPlay(log.status === "want_to_play");
        }

        // Similar games
        if (g.similar_games && g.similar_games.length > 0) {
          const similar = await getGames(g.similar_games.slice(0, 6));
          if (!cancelled) setSimilarGames(similar);
        }

        // Friends' ratings
        if (userId) {
          const friendIds = await getFriends(supabase, userId);
          if (friendIds.length > 0) {
            const { data: friendLogs } = await supabase
              .from("game_logs")
              .select("user_id, rating")
              .in("user_id", friendIds)
              .eq("game_igdb_id", Number(id))
              .not("rating", "is", null);

            if (friendLogs && friendLogs.length > 0 && !cancelled) {
              const uniqueUserIds = friendLogs.map((r) => r.user_id);
              const { data: userRows } = await supabase
                .from("users")
                .select("id, username")
                .in("id", uniqueUserIds);

              const userMap = new Map((userRows ?? []).map((u) => [u.id, u]));
              const ratings: FriendRating[] = [];
              for (const row of friendLogs) {
                const user = userMap.get(row.user_id);
                if (user && row.rating != null) {
                  ratings.push({ user, rating: row.rating });
                }
              }
              setFriendRatings(ratings);
            }
          }
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
      <div style={{ position: "relative", height: 420, overflow: "hidden" }}>
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
            background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 40%, var(--bg) 100%)",
          }}
        />

        {/* Hero content centred */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              width: "100%",
              padding: "0 24px",
              display: "flex",
              gap: "2rem",
              alignItems: "center",
            }}
          >
            {coverUrl && (
              <img
                src={coverUrl}
                alt={game.name}
                style={{
                  width: 200,
                  flexShrink: 0,
                  borderRadius: 10,
                  boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
                }}
              />
            )}

            <div>
              <h1
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1.15,
                  margin: 0,
                  marginBottom: "0.6rem",
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
                        padding: "0.2rem 0.65rem",
                        background: "var(--border)",
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                      }}
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                {year && <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{year}</span>}
                {game.platforms && game.platforms.length > 0 && (
                  <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    {game.platforms.map((p) => p.name).join(", ")}
                  </span>
                )}
              </div>

              {communityRating && (
                <div style={{ marginBottom: "1rem" }}>
                  <span
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontSize: "2.5rem",
                      fontWeight: 800,
                      color: "var(--accent)",
                      lineHeight: 1,
                    }}
                  >
                    {communityRating}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: "0.85rem", marginLeft: "0.5rem" }}>
                    {game.rating_count != null && `(${game.rating_count.toLocaleString()} ratings)`}
                  </span>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {userId && (
                  <button
                    onClick={() => setShowLogModal(true)}
                    style={{
                      padding: "0.6rem 1.5rem",
                      background: "var(--accent)",
                      border: "none",
                      color: "#0e0e10",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      fontFamily: "Syne, sans-serif",
                    }}
                  >
                    {existingLog && existingLog.status !== "want_to_play" ? "Edit log" : "Log this game"}
                  </button>
                )}

                {userId && (!existingLog || existingLog.status === "want_to_play") && (
                  <button
                    onClick={handleWantToPlay}
                    disabled={wtpSaving}
                    style={{
                      padding: "0.6rem 1.25rem",
                      background: wantToPlay ? "rgba(228,255,26,0.1)" : "transparent",
                      border: `1px solid ${wantToPlay ? "var(--accent)" : "var(--border)"}`,
                      color: wantToPlay ? "var(--accent)" : "var(--muted)",
                      borderRadius: 8,
                      cursor: wtpSaving ? "not-allowed" : "pointer",
                      fontSize: "0.875rem",
                      fontWeight: wantToPlay ? 600 : 400,
                      opacity: wtpSaving ? 0.7 : 1,
                    }}
                  >
                    {wantToPlay ? "✓ Want to Play" : "+ Want to Play"}
                  </button>
                )}
              </div>

              {saveError && <p style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "0.5rem" }}>{saveError}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2.5rem 24px 4rem" }}>

        {/* Friends' ratings strip */}
        {userId && (
          <section style={{ marginBottom: "2.5rem" }}>
            <h2
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginBottom: "0.75rem",
              }}
            >
              Your Friends Rated This
            </h2>
            {friendRatings.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                None of your friends have played this yet.
              </p>
            ) : (
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {friendRatings.map((fr) => (
                  <div
                    key={fr.user.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "0.5rem 0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        color: "#0e0e10",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        fontFamily: "Syne, sans-serif",
                        flexShrink: 0,
                      }}
                    >
                      {fr.user.username[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontSize: "0.875rem", color: "var(--text)" }}>{fr.user.username}</span>
                    <span
                      style={{
                        background: "var(--accent)",
                        color: "#0e0e10",
                        borderRadius: 4,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "1px 6px",
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2.5rem", alignItems: "start" }}>
          <div>
            {game.summary && (
              <p style={{ fontSize: "0.95rem", color: "var(--text)", lineHeight: 1.8, marginBottom: "1.5rem" }}>
                {game.summary}
              </p>
            )}

            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
              {developer && (
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Developer</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text)" }}>{developer}</div>
                </div>
              )}
              {publisher && publisher !== developer && (
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Publisher</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text)" }}>{publisher}</div>
                </div>
              )}
              {year && (
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Released</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text)" }}>{year}</div>
                </div>
              )}
            </div>

            {game.platforms && game.platforms.length > 0 && (
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Platforms</div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {game.platforms.map((p) => (
                    <span
                      key={p.id}
                      style={{
                        padding: "0.2rem 0.65rem",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        fontSize: "0.8rem",
                        color: "var(--muted)",
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
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "1.25rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "0.75rem",
                }}
              >
                Your Log
              </div>
              <div style={{ fontSize: "0.9rem", color: "var(--text)", marginBottom: "0.4rem", textTransform: "capitalize" }}>
                {existingLog.status.replace("_", " ")}
              </div>
              {existingLog.rating != null && (
                <div style={{ marginBottom: "0.4rem" }}>
                  <span style={{ background: "var(--accent)", color: "#0e0e10", borderRadius: 4, fontSize: "0.8rem", fontWeight: 700, padding: "2px 8px" }}>
                    {existingLog.rating}/10
                  </span>
                </div>
              )}
              {existingLog.review && (
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.5, marginTop: "0.5rem" }}>
                  {existingLog.review.length > 120 ? existingLog.review.slice(0, 120) + "…" : existingLog.review}
                </p>
              )}
              <button
                onClick={() => setShowLogModal(true)}
                style={{
                  marginTop: "0.75rem",
                  padding: "0.4rem 0.9rem",
                  background: "none",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Similar games */}
        {similarGames.length > 0 && (
          <section style={{ marginTop: "3rem" }}>
            <h2
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginBottom: "1rem",
              }}
            >
              Similar Games
            </h2>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                overflowX: "auto",
                paddingBottom: "0.5rem",
                scrollbarWidth: "none",
              }}
            >
              {similarGames.map((g) => (
                <div key={g.id} style={{ flex: "0 0 130px" }}>
                  <GameCard game={g} onSelect={(sg) => navigate(`/game/${sg.id}`)} />
                </div>
              ))}
            </div>
          </section>
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
    </div>
  );
}
