import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import type { UserRow, TopGameRow, GameLogRow, IGDBGame, ActivityRow } from "@gameboxd/lib";
import {
  getProfile, getTopGames, getUserGameLogs, updateProfile, setTopGame,
  removeTopGame, getCoverUrl, sendFriendRequest, getUserActivity, getFriendshipStatus,
} from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { getGames, searchGames } from "../lib/igdb";
import ActivityCard from "../components/ActivityCard";
import Spinner from "../components/Spinner";
import GameCover from "../components/GameCover";
import ShelfLibrary from "../components/ShelfLibrary";
import UserLists from "../components/UserLists";
import { useIsMobile } from "../hooks/useIsMobile";

type ProfileTab = "logs" | "reviews" | "lists";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="label" style={{ marginBottom: "var(--space-4)" }}>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { userId: myUserId, profile: myProfile, setProfile } = useAuthStore();
  const isOwn = paramUserId === myUserId;
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [profile, setPageProfile] = useState<UserRow | null>(null);
  const [topGames, setTopGames] = useState<TopGameRow[]>([]);
  const [topGameData, setTopGameData] = useState<Map<number, IGDBGame>>(new Map());
  const [topGameHovered, setTopGameHovered] = useState<number | null>(null);
  const [logs, setLogs] = useState<GameLogRow[]>([]);
  const [logGameData, setLogGameData] = useState<Map<number, IGDBGame>>(new Map());
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [activityGames, setActivityGames] = useState<Map<number, Pick<IGDBGame, "id" | "name" | "cover">>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("logs");
  const [activityLimit, setActivityLimit] = useState(20);

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  // Top game slot assignment
  const [assigningSlot, setAssigningSlot] = useState<1 | 2 | 3 | null>(null);
  const [slotSearch, setSlotSearch] = useState("");
  const [slotResults, setSlotResults] = useState<IGDBGame[]>([]);
  const [slotSearching, setSlotSearching] = useState(false);

  // Friend state (for other profiles)
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  useEffect(() => {
    if (!paramUserId) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [prof, tops, gameLogs] = await Promise.all([
          getProfile(supabase, paramUserId!),
          getTopGames(supabase, paramUserId!),
          getUserGameLogs(supabase, paramUserId!),
        ]);
        setPageProfile(prof);
        setTopGames(tops);
        setLogs(gameLogs);

        // Fetch IGDB data for top games
        if (tops.length > 0) {
          const topData = await getGames(tops.map((t) => t.game_igdb_id));
          const m = new Map<number, IGDBGame>();
          for (const g of topData) m.set(g.id, g);
          setTopGameData(m);
        }

        // Fetch IGDB data for logs (for tabs)
        if (gameLogs.length > 0) {
          const logIds = [...new Set(gameLogs.map((l) => l.game_igdb_id))].slice(0, 50);
          const logData = await getGames(logIds);
          const lm = new Map<number, IGDBGame>();
          for (const g of logData) lm.set(g.id, g);
          setLogGameData(lm);
        }

        // Fetch activity
        const actRows = await getUserActivity(supabase, paramUserId!, 20);

        if (actRows.length > 0) {
          setActivities(actRows);
          const actGameIds = [...new Set(actRows.map((a) => a.game_igdb_id))];
          const actGames = await getGames(actGameIds);
          const gm = new Map<number, Pick<IGDBGame, "id" | "name" | "cover">>();
          for (const g of actGames) gm.set(g.id, g);
          setActivityGames(gm);
        }

        // Check friendship (if not own profile)
        if (!isOwn && myUserId) {
          const friendship = await getFriendshipStatus(supabase, myUserId, paramUserId!);
          setIsFriend(friendship.status === "accepted");
          setFriendRequestSent(friendship.status === "pending_sent");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [paramUserId, isOwn, myUserId]);

  const stats = {
    logged: logs.length,
    avgRating:
      logs.filter((l) => l.rating != null).length > 0
        ? (
            logs.filter((l) => l.rating != null).reduce((s, l) => s + (l.rating ?? 0), 0) /
            logs.filter((l) => l.rating != null).length
          ).toFixed(1)
        : null,
    reviews: logs.filter((l) => l.review).length,
  };

  const handleSaveProfile = async () => {
    if (!myUserId) return;
    setSaving(true);
    try {
      const updated = await updateProfile(supabase, myUserId, {
        bio: editBio.trim() || null,
        avatar_url: editAvatar.trim() || null,
      });
      setPageProfile(updated);
      if (isOwn) setProfile(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSlotSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotSearch.trim()) return;
    setSlotSearching(true);
    try {
      const res = await searchGames(slotSearch.trim());
      setSlotResults(res);
    } finally {
      setSlotSearching(false);
    }
  };

  const handleAssignSlot = async (game: IGDBGame) => {
    if (!assigningSlot || !myUserId) return;
    await setTopGame(supabase, myUserId, assigningSlot, game.id);
    const updated = await getTopGames(supabase, myUserId);
    setTopGames(updated);
    const ids = updated.map((t) => t.game_igdb_id);
    const data = await getGames(ids);
    const m = new Map<number, IGDBGame>();
    for (const g of data) m.set(g.id, g);
    setTopGameData(m);
    setAssigningSlot(null);
    setSlotSearch("");
    setSlotResults([]);
  };

  const handleRemoveSlot = async (position: 1 | 2 | 3) => {
    if (!myUserId) return;
    await removeTopGame(supabase, myUserId, position);
    setTopGames((prev) => prev.filter((g) => g.position !== position));
    setTopGameData((prev) => {
      const entry = topGames.find((g) => g.position === position);
      if (!entry) return prev;
      const m = new Map(prev);
      m.delete(entry.game_igdb_id);
      return m;
    });
  };

  const handleFriendRequest = async () => {
    if (!myUserId || !paramUserId) return;
    setFriendActionLoading(true);
    try {
      await sendFriendRequest(supabase, myUserId, paramUserId);
      setFriendRequestSent(true);
    } catch {
      // ignore duplicate request errors
    } finally {
      setFriendActionLoading(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spinner />
    </div>
  );
  if (error) return <div style={{ padding: "2rem", color: "var(--danger)" }}>{error}</div>;
  if (!profile) return null;

  const reviewLogs = logs.filter((l) => l.review);

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: isMobile ? "1.5rem 16px 3rem" : "2.5rem 24px 4rem",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "280px 1fr",
        gap: isMobile ? "2rem" : "3rem",
        alignItems: "start",
      }}
    >
      {/* ── Left column (stacks above content on mobile) ── */}
      <div style={isMobile ? {} : { position: "sticky", top: 76 }}>

        {/* Avatar + user info */}
        <div style={{ marginBottom: "var(--space-5)" }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-ring)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: "1.875rem",
              fontFamily: "var(--font-display)",
              marginBottom: "var(--space-4)",
            }}
          >
            {profile.username[0]?.toUpperCase()}
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "var(--text-2xl)",
              letterSpacing: "-0.015em",
              color: "var(--text-primary)",
              marginBottom: "var(--space-2)",
              lineHeight: 1.2,
            }}
          >
            {profile.username}
          </h1>

          {profile.bio && (
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "var(--text-sm)",
                lineHeight: 1.6,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                marginBottom: "var(--space-3)",
              }}
            >
              {profile.bio}
            </p>
          )}

          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", fontVariantNumeric: "tabular-nums" }}>
            {stats.logged} games
            {stats.avgRating && ` · ${stats.avgRating} avg`}
            {stats.reviews > 0 && ` · ${stats.reviews} reviews`}
          </p>
        </div>

        {/* Action button */}
        {isOwn ? (
          !editing ? (
            <button
              onClick={() => {
                setEditBio(profile.bio ?? "");
                setEditAvatar(profile.avatar_url ?? "");
                setEditing(true);
              }}
              style={{
                padding: "0.45rem 1rem",
                background: "none",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
              }}
            >
              Edit profile
            </button>
          ) : (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "1rem",
                marginBottom: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "0.4rem 0.6rem",
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.875rem",
                    fontFamily: "var(--font-body)",
                    resize: "vertical",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Avatar URL</label>
                <input
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: "100%",
                    padding: "0.4rem 0.6rem",
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.875rem",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  style={{
                    padding: "0.4rem 0.9rem",
                    background: "var(--accent)",
                    border: "none",
                    color: "var(--on-accent)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    padding: "0.4rem 0.9rem",
                    background: "none",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )
        ) : myUserId ? (
          <div style={{ marginBottom: "1.25rem" }}>
            {isFriend ? (
              <span
                style={{
                  display: "inline-block",
                  padding: "0.45rem 1rem",
                  background: "var(--accent-dim)",
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                Friends
              </span>
            ) : friendRequestSent ? (
              <span
                style={{
                  display: "inline-block",
                  padding: "0.45rem 1rem",
                  background: "none",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                }}
              >
                Request sent
              </span>
            ) : (
              <button
                onClick={handleFriendRequest}
                disabled={friendActionLoading}
                style={{
                  padding: "0.45rem 1rem",
                  background: "var(--accent)",
                  border: "none",
                  color: "var(--on-accent)",
                  borderRadius: "var(--radius-sm)",
                  cursor: friendActionLoading ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  opacity: friendActionLoading ? 0.7 : 1,
                }}
              >
                Add friend
              </button>
            )}
          </div>
        ) : null}

        {/* Top 3 games */}
        <SectionLabel>Favourites</SectionLabel>

        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          {([1, 2, 3] as const).map((pos) => {
            const entry = topGames.find((g) => g.position === pos);
            const game = entry ? topGameData.get(entry.game_igdb_id) : null;
            const posLabel = pos === 1 ? "01" : pos === 2 ? "02" : "03";

            return (
              <div
                key={pos}
                style={{ flex: 1, position: "relative", minWidth: 0 }}
                onMouseEnter={() => setTopGameHovered(pos)}
                onMouseLeave={() => setTopGameHovered(null)}
              >
                {game ? (
                  <GameCover
                    name={game.name}
                    imageId={game.cover?.image_id}
                    rounding="md"
                    interactive
                    onClick={() => navigate(`/game/${game.id}`)}
                  >
                    {/* Position number — editorial index mark */}
                    <span
                      style={{
                        position: "absolute",
                        bottom: 4,
                        left: 7,
                        fontFamily: "var(--font-display)",
                        fontSize: "1.75rem",
                        fontWeight: 600,
                        color: "rgba(245, 243, 240, 0.28)",
                        lineHeight: 1,
                        pointerEvents: "none",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {posLabel}
                    </span>

                    {/* Hover overlay (own profile) */}
                    {isOwn && topGameHovered === pos && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSlot(pos);
                          }}
                          aria-label={`Remove ${game.name} from favourites`}
                          style={{
                            position: "absolute",
                            top: 5,
                            right: 5,
                            background: "rgba(0,0,0,0.78)",
                            border: "none",
                            color: "var(--text-primary)",
                            borderRadius: "50%",
                            width: 24,
                            height: 24,
                            cursor: "pointer",
                            fontSize: "0.7rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ✕
                        </button>
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: "linear-gradient(to top, rgba(0,0,0,0.92), transparent)",
                            padding: "1.5rem 0.5rem 0.5rem",
                            pointerEvents: "none",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "var(--text-xs)",
                              fontWeight: 600,
                              fontFamily: "var(--font-display)",
                              color: "var(--text-primary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {game.name}
                          </div>
                        </div>
                      </>
                    )}
                  </GameCover>
                ) : (
                  <div
                    onClick={() => isOwn && setAssigningSlot(pos)}
                    style={{
                      aspectRatio: "3 / 4",
                      background: "var(--bg-inset)",
                      border: "1px dashed var(--border-strong)",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-muted)",
                      cursor: isOwn ? "pointer" : "default",
                      gap: "var(--space-1)",
                      fontSize: "var(--text-xs)",
                      transition: "border-color var(--transition), color var(--transition)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isOwn) return;
                      e.currentTarget.style.borderColor = "var(--accent-ring)";
                      e.currentTarget.style.color = "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-strong)";
                      e.currentTarget.style.color = "var(--text-muted)";
                    }}
                  >
                    {isOwn ? (
                      <>
                        <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>+</span>
                        <span>Add</span>
                      </>
                    ) : (
                      <span style={{ fontSize: "1rem" }}>—</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Slot assignment search */}
        {assigningSlot && (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--radius-sm)",
              padding: "0.75rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.6rem", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Slot #{assigningSlot}</span>
              <button
                onClick={() => { setAssigningSlot(null); setSlotResults([]); setSlotSearch(""); }}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSlotSearch} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem" }}>
              <input
                value={slotSearch}
                onChange={(e) => setSlotSearch(e.target.value)}
                placeholder="Search game..."
                style={{
                  flex: 1,
                  padding: "0.35rem 0.6rem",
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                }}
              />
              <button
                type="submit"
                disabled={slotSearching}
                style={{
                  padding: "0.35rem 0.6rem",
                  background: "var(--accent)",
                  border: "none",
                  color: "var(--on-accent)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                {slotSearching ? "..." : "Go"}
              </button>
            </form>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 160, overflowY: "auto" }}>
              {slotResults.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleAssignSlot(g)}
                  style={{
                    padding: "0.35rem 0.6rem",
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right column ── */}
      <div>

        {/* Recent Activity */}
        {activities.length > 0 && (
          <section style={{ marginBottom: "2.5rem" }}>
            <SectionLabel>Recent Activity</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {activities.slice(0, activityLimit).map((activity) => {
                const game = activityGames.get(activity.game_igdb_id);
                if (!game) return null;
                return (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    user={profile}
                    game={game}
                  />
                );
              })}
            </div>
            {activities.length > activityLimit && (
              <button
                onClick={() => setActivityLimit((n) => n + 20)}
                style={{
                  marginTop: "0.75rem",
                  padding: "0.45rem 1rem",
                  background: "none",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Load more
              </button>
            )}
          </section>
        )}

        {/* Tabs */}
        <div>
          <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
            {(["logs", "reviews", "lists"] as ProfileTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "0.5rem 1.25rem",
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${activeTab === tab ? "var(--accent)" : "transparent"}`,
                  color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: activeTab === tab ? 600 : 400,
                  marginBottom: -1,
                  textTransform: "capitalize",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                {tab === "logs" ? `${isOwn ? "Shelf" : `${profile.username}'s Shelf`} (${logs.length})` :
                 tab === "reviews" ? `Reviews (${reviewLogs.length})` : "Lists"}
              </button>
            ))}
          </div>

          {/* Shelf tab — the same library view as /shelf */}
          {activeTab === "logs" && <ShelfLibrary logs={logs} games={logGameData} />}

          {/* Reviews tab */}
          {activeTab === "reviews" && (
            reviewLogs.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No reviews yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {reviewLogs.map((log) => {
                  const game = logGameData.get(log.game_igdb_id);
                  if (!game || !log.review) return null;
                  const excerpt = log.review.length > 180
                    ? log.review.slice(0, 180).trimEnd() + "…"
                    : log.review;
                  return (
                    <Link
                      key={log.id}
                      to={`/game/${log.game_igdb_id}`}
                      style={{
                        display: "flex",
                        gap: "var(--space-4)",
                        textDecoration: "none",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)",
                        padding: "var(--space-4)",
                        transition: "border-color var(--transition)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-ring)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    >
                      <div style={{ width: 52, flexShrink: 0 }}>
                        <GameCover
                          name={game.name}
                          imageId={game.cover?.image_id}
                          size="cover_small"
                          rounding="sm"
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 600,
                            fontSize: "var(--text-base)",
                            color: "var(--text-primary)",
                            marginBottom: "var(--space-1)",
                          }}
                        >
                          {game.name}
                        </div>
                        {log.rating != null && (
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--accent)", marginBottom: "var(--space-2)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                            {log.rating}/10
                          </div>
                        )}
                        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                          {excerpt}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          )}

          {/* Lists tab */}
          {activeTab === "lists" && paramUserId && (
            <UserLists userId={paramUserId} isOwn={isOwn} />
          )}
        </div>
      </div>
    </div>
  );
}
