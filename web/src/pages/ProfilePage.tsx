import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { UserRow, TopGameRow, GameLogRow, IGDBGame, ActivityRow } from "@gameboxd/lib";
import {
  getProfile, getTopGames, getUserGameLogs, updateProfile,
  setTopGame, removeTopGame, getCoverUrl, getFriends, sendFriendRequest,
} from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { getGames, searchGames } from "../lib/igdb";
import ActivityCard from "../components/ActivityCard";
import Spinner from "../components/Spinner";

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
    <div
      style={{
        fontFamily: "Syne, sans-serif",
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--muted)",
        marginBottom: "1rem",
      }}
    >
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { userId: myUserId, profile: myProfile, setProfile } = useAuthStore();
  const isOwn = paramUserId === myUserId;

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
        const { data: actRows } = await supabase
          .from("activity")
          .select("*")
          .eq("user_id", paramUserId!)
          .order("created_at", { ascending: false })
          .limit(20);

        if (actRows && actRows.length > 0) {
          setActivities(actRows as ActivityRow[]);
          const actGameIds = [...new Set((actRows as ActivityRow[]).map((a) => a.game_igdb_id))];
          const actGames = await getGames(actGameIds);
          const gm = new Map<number, Pick<IGDBGame, "id" | "name" | "cover">>();
          for (const g of actGames) gm.set(g.id, g);
          setActivityGames(gm);
        }

        // Check friendship (if not own profile)
        if (!isOwn && myUserId) {
          const friendIds = await getFriends(supabase, myUserId);
          setIsFriend(friendIds.includes(paramUserId!));
          // Check for pending request
          const { data: pending } = await supabase
            .from("friendships")
            .select("id")
            .eq("requester_id", myUserId)
            .eq("addressee_id", paramUserId!)
            .eq("status", "pending")
            .maybeSingle();
          setFriendRequestSent(!!pending);
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

  if (loading) return <div style={{ padding: "3rem 24px", color: "var(--muted)" }}><Spinner /></div>;
  if (error) return <div style={{ padding: "2rem", color: "var(--danger)" }}>{error}</div>;
  if (!profile) return null;

  const reviewLogs = logs.filter((l) => l.review);

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "2.5rem 24px 4rem",
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        gap: "3rem",
        alignItems: "start",
      }}
    >
      {/* ── Left column ── */}
      <div style={{ position: "sticky", top: 76 }}>

        {/* Avatar + user info */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "var(--accent)",
              color: "#0e0e10",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "2rem",
              fontFamily: "Syne, sans-serif",
              marginBottom: "0.75rem",
            }}
          >
            {profile.username[0]?.toUpperCase()}
          </div>

          <h1
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: "1.5rem",
              color: "var(--text)",
              marginBottom: "0.35rem",
            }}
          >
            {profile.username}
          </h1>

          {profile.bio && (
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.875rem",
                lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                marginBottom: "0.5rem",
              }}
            >
              {profile.bio}
            </p>
          )}

          <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
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
                color: "var(--muted)",
                borderRadius: 8,
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
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "1rem",
                marginBottom: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "0.4rem 0.6rem",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    borderRadius: 6,
                    fontSize: "0.875rem",
                    fontFamily: "Inter, sans-serif",
                    resize: "vertical",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>Avatar URL</label>
                <input
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: "100%",
                    padding: "0.4rem 0.6rem",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    borderRadius: 6,
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
                    color: "#0e0e10",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 700,
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
                    color: "var(--muted)",
                    borderRadius: 6,
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
                  background: "rgba(228,255,26,0.1)",
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  borderRadius: 8,
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
                  color: "var(--muted)",
                  borderRadius: 8,
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
                  color: "#0e0e10",
                  borderRadius: 8,
                  cursor: friendActionLoading ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  opacity: friendActionLoading ? 0.7 : 1,
                }}
              >
                Add friend
              </button>
            )}
          </div>
        ) : null}

        {/* Top 3 games */}
        <SectionLabel>Favourite Games</SectionLabel>

        <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.75rem" }}>
          {([1, 2, 3] as const).map((pos) => {
            const entry = topGames.find((g) => g.position === pos);
            const game = entry ? topGameData.get(entry.game_igdb_id) : null;
            const posLabel = pos === 1 ? "01" : pos === 2 ? "02" : "03";

            return (
              <div
                key={pos}
                style={{ flex: 1, position: "relative" }}
                onMouseEnter={() => setTopGameHovered(pos)}
                onMouseLeave={() => setTopGameHovered(null)}
              >
                {game ? (
                  <div style={{ position: "relative" }}>
                    <Link to={`/game/${game.id}`}>
                      <img
                        src={getCoverUrl(game.cover?.image_id ?? "", "cover_big")}
                        alt={game.name}
                        style={{
                          width: "100%",
                          aspectRatio: "2/3",
                          objectFit: "cover",
                          borderRadius: 6,
                          display: "block",
                        }}
                      />
                    </Link>

                    {/* Position number */}
                    <span
                      style={{
                        position: "absolute",
                        bottom: 4,
                        left: 6,
                        fontFamily: "Syne, sans-serif",
                        fontSize: "2rem",
                        fontWeight: 800,
                        color: "rgba(255,255,255,0.25)",
                        lineHeight: 1,
                        pointerEvents: "none",
                      }}
                    >
                      {posLabel}
                    </span>

                    {/* Hover overlay (own profile) */}
                    {isOwn && topGameHovered === pos && (
                      <>
                        <button
                          onClick={() => handleRemoveSlot(pos)}
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            background: "rgba(0,0,0,0.75)",
                            border: "none",
                            color: "#fff",
                            borderRadius: "50%",
                            width: 22,
                            height: 22,
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
                            background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
                            borderRadius: "0 0 6px 6px",
                            padding: "1.5rem 0.4rem 0.4rem",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: 600,
                              color: "#fff",
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
                  </div>
                ) : (
                  <div
                    onClick={() => isOwn && setAssigningSlot(pos)}
                    style={{
                      aspectRatio: "2/3",
                      background: "var(--surface)",
                      border: "2px dashed var(--border)",
                      borderRadius: 6,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--muted)",
                      cursor: isOwn ? "pointer" : "default",
                      gap: "0.25rem",
                      fontSize: "0.65rem",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) => isOwn && (e.currentTarget.style.borderColor = "var(--accent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    {isOwn && (
                      <>
                        <span style={{ fontSize: "1.2rem" }}>+</span>
                        <span>Add</span>
                      </>
                    )}
                    {!isOwn && <span style={{ fontSize: "1rem" }}>—</span>}
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
              background: "var(--surface)",
              border: "1px solid var(--accent)",
              borderRadius: 8,
              padding: "0.75rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.6rem", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Slot #{assigningSlot}</span>
              <button
                onClick={() => { setAssigningSlot(null); setSlotResults([]); setSlotSearch(""); }}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.85rem" }}
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
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  borderRadius: 6,
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
                  color: "#0e0e10",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 700,
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
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    borderRadius: 6,
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
                  color: "var(--muted)",
                  borderRadius: 8,
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
                  color: activeTab === tab ? "var(--text)" : "var(--muted)",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: activeTab === tab ? 600 : 400,
                  marginBottom: -1,
                  textTransform: "capitalize",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                {tab === "logs" ? `Logs (${logs.length})` :
                 tab === "reviews" ? `Reviews (${reviewLogs.length})` : "Lists"}
              </button>
            ))}
          </div>

          {/* Logs tab */}
          {activeTab === "logs" && (
            logs.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No games logged yet.</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                  gap: "0.6rem",
                }}
              >
                {logs.map((log) => {
                  const game = logGameData.get(log.game_igdb_id);
                  if (!game) return null;
                  return (
                    <Link
                      key={log.id}
                      to={`/game/${log.game_igdb_id}`}
                      style={{ textDecoration: "none", position: "relative", display: "block" }}
                    >
                      {game.cover ? (
                        <img
                          src={getCoverUrl(game.cover.image_id, "cover_big")}
                          alt={game.name}
                          title={game.name}
                          style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 6, display: "block" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "2/3",
                            background: "var(--border)",
                            borderRadius: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--muted)",
                            fontSize: "0.65rem",
                          }}
                        >
                          {game.name}
                        </div>
                      )}
                      {log.rating != null && (
                        <span
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            background: "var(--accent)",
                            color: "#0e0e10",
                            borderRadius: 4,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            padding: "1px 5px",
                            lineHeight: 1.4,
                          }}
                        >
                          {log.rating}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )
          )}

          {/* Reviews tab */}
          {activeTab === "reviews" && (
            reviewLogs.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No reviews yet.</p>
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
                        gap: "0.75rem",
                        textDecoration: "none",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "0.75rem",
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    >
                      {game.cover && (
                        <img
                          src={getCoverUrl(game.cover.image_id, "thumb")}
                          alt={game.name}
                          style={{ width: 50, objectFit: "cover", borderRadius: 4, flexShrink: 0, alignSelf: "flex-start" }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "Syne, sans-serif",
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            color: "var(--text)",
                            marginBottom: "0.2rem",
                          }}
                        >
                          {game.name}
                        </div>
                        {log.rating != null && (
                          <div style={{ fontSize: "0.75rem", color: "var(--accent)", marginBottom: "0.4rem", fontWeight: 600 }}>
                            {log.rating}/10
                          </div>
                        )}
                        <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
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
          {activeTab === "lists" && (
            <div
              style={{
                padding: "2rem",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                textAlign: "center",
                color: "var(--muted)",
                fontSize: "0.9rem",
              }}
            >
              Coming soon — curated lists are on the way.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
