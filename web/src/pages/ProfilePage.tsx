import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { UserRow, TopGameRow, GameLogRow, IGDBGame, ActivityRow } from "@gameboxd/lib";
import { getProfile, getTopGames, getUserGameLogs, updateProfile, setTopGame, removeTopGame } from "@gameboxd/lib";
import { getCoverUrl } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { getGames, searchGames } from "../lib/igdb";
import ActivityCard from "../components/ActivityCard";

export default function ProfilePage() {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { userId: myUserId, profile: myProfile, setProfile } = useAuthStore();
  const isOwn = paramUserId === myUserId;

  const [profile, setPageProfile] = useState<UserRow | null>(null);
  const [topGames, setTopGames] = useState<TopGameRow[]>([]);
  const [topGameData, setTopGameData] = useState<Map<number, IGDBGame>>(new Map());
  const [logs, setLogs] = useState<GameLogRow[]>([]);
  const [likedGames, setFavouriteGames] = useState<Map<number, IGDBGame>>(new Map());
  const [likedLogs, setFavouriteLogs] = useState<GameLogRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [activityGames, setActivityGames] = useState<Map<number, Pick<IGDBGame, "id" | "name" | "cover">>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch IGDB data for liked games
        const likedLogs = gameLogs.filter((l) => l.is_liked).slice(0, 5);
        setFavouriteLogs(likedLogs);
        if (likedLogs.length > 0) {
          const favData = await getGames(likedLogs.map((l) => l.game_igdb_id));
          const fm = new Map<number, IGDBGame>();
          for (const g of favData) fm.set(g.id, g);
          setFavouriteGames(fm);
        }

        // Fetch IGDB data for top games
        if (tops.length > 0) {
          const topIgdbIds = tops.map((t) => t.game_igdb_id);
          const topData = await getGames(topIgdbIds);
          const m = new Map<number, IGDBGame>();
          for (const g of topData) m.set(g.id, g);
          setTopGameData(m);
        }

        // Fetch activity (reuse game_logs as a proxy for recent activity)
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
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [paramUserId]);

  const stats = {
    logged: logs.length,
    completed: logs.filter((l) => l.status === "completed").length,
    avgRating:
      logs.filter((l) => l.rating != null).length > 0
        ? (
            logs.filter((l) => l.rating != null).reduce((sum, l) => sum + (l.rating ?? 0), 0) /
            logs.filter((l) => l.rating != null).length
          ).toFixed(1)
        : null,
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
  };

  if (loading) return <div style={{ padding: "2rem", color: "var(--muted)" }}>Loading...</div>;
  if (error) return <div style={{ padding: "2rem", color: "#f55" }}>{error}</div>;
  if (!profile) return null;

  return (
    <div style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
      {/* Profile header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5rem", marginBottom: "2rem" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "var(--accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "1.8rem",
            flexShrink: 0,
          }}
        >
          {profile.username[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>{profile.username}</h1>
          {profile.bio && (
            <p style={{ color: "var(--muted)", marginTop: 4, fontSize: "0.9rem" }}>{profile.bio}</p>
          )}
          {isOwn && !editing && (
            <button
              onClick={() => {
                setEditBio(profile.bio ?? "");
                setEditAvatar(profile.avatar_url ?? "");
                setEditing(true);
              }}
              style={{
                marginTop: "0.5rem",
                padding: "0.3rem 0.75rem",
                background: "none",
                border: "1px solid var(--border)",
                color: "var(--muted)",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Edit profile form */}
      {editing && (
        <div
          style={{
            padding: "1rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
              Bio
            </label>
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
                fontSize: "0.9rem",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
              Avatar URL
            </label>
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
                fontSize: "0.9rem",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              style={{
                padding: "0.4rem 1rem",
                background: "var(--accent)",
                border: "none",
                color: "#fff",
                borderRadius: 6,
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
                padding: "0.4rem 1rem",
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
      )}

      {/* Stats bar */}
      <div
        style={{
          display: "flex",
          gap: "0",
          marginBottom: "2rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {[
          { label: "Games Logged", value: stats.logged },
          { label: "Completed", value: stats.completed },
          { label: "Avg Rating", value: stats.avgRating ?? "—" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              padding: "1rem",
              textAlign: "center",
              borderLeft: i > 0 ? "1px solid var(--border)" : "none",
            }}
          >
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>
              {stat.value}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Liked Games */}
      {likedLogs.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", color: "var(--muted)" }}>
            LIKED GAMES
          </h2>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {likedLogs.map((log) => {
              const g = likedGames.get(log.game_igdb_id);
              if (!g) return null;
              return (
                <Link key={log.id} to={`/game/${g.id}`} style={{ textDecoration: "none", flex: "0 0 auto" }}>
                  <div style={{ width: 80 }}>
                    {g.cover ? (
                      <img
                        src={getCoverUrl(g.cover.image_id, "cover_big")}
                        alt={g.name}
                        title={g.name}
                        style={{ width: "100%", borderRadius: 6, display: "block" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "264/374",
                          background: "var(--border)",
                          borderRadius: 6,
                        }}
                      />
                    )}
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: "0.7rem",
                        color: "var(--muted)",
                        textAlign: "center",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {g.name}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Top 3 games */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", color: "var(--muted)" }}>
          TOP GAMES
        </h2>
        <div style={{ display: "flex", gap: "1rem" }}>
          {([1, 2, 3] as const).map((pos) => {
            const entry = topGames.find((g) => g.position === pos);
            const game = entry ? topGameData.get(entry.game_igdb_id) : null;

            return (
              <div key={pos} style={{ flex: 1 }}>
                <div style={{ marginBottom: "0.4rem", fontSize: "0.7rem", color: "var(--muted)", textAlign: "center" }}>
                  #{pos}
                </div>
                {game ? (
                  <div style={{ position: "relative" }}>
                    <img
                      src={getCoverUrl(game.cover?.image_id ?? "", "cover_big")}
                      alt={game.name}
                      style={{ width: "100%", borderRadius: 6, display: "block" }}
                    />
                    {isOwn && (
                      <button
                        onClick={() => handleRemoveSlot(pos)}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "rgba(0,0,0,0.7)",
                          border: "none",
                          color: "#fff",
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✕
                      </button>
                    )}
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: "0.75rem",
                        textAlign: "center",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {game.name}
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => isOwn && setAssigningSlot(pos)}
                    style={{
                      aspectRatio: "264/374",
                      background: "var(--surface)",
                      border: "2px dashed var(--border)",
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--muted)",
                      fontSize: "1.5rem",
                      cursor: isOwn ? "pointer" : "default",
                    }}
                  >
                    {isOwn ? "+" : "—"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Slot assignment search */}
      {assigningSlot && (
        <div
          style={{
            padding: "1rem",
            background: "var(--surface)",
            border: "1px solid var(--accent)",
            borderRadius: 8,
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <span style={{ fontWeight: 600 }}>Assign slot #{assigningSlot}</span>
            <button
              onClick={() => { setAssigningSlot(null); setSlotResults([]); setSlotSearch(""); }}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleSlotSearch} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <input
              value={slotSearch}
              onChange={(e) => setSlotSearch(e.target.value)}
              placeholder="Search game..."
              style={{
                flex: 1,
                padding: "0.4rem 0.6rem",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: 6,
                fontSize: "0.9rem",
              }}
            />
            <button
              type="submit"
              disabled={slotSearching}
              style={{
                padding: "0.4rem 0.75rem",
                background: "var(--accent)",
                border: "none",
                color: "#fff",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              {slotSearching ? "..." : "Search"}
            </button>
          </form>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {slotResults.map((g) => (
              <button
                key={g.id}
                onClick={() => handleAssignSlot(g)}
                style={{
                  padding: "0.3rem 0.75rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  borderRadius: 20,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {activities.length > 0 && (
        <section>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", color: "var(--muted)" }}>
            RECENT ACTIVITY
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {activities.map((activity) => {
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
        </section>
      )}
    </div>
  );
}
