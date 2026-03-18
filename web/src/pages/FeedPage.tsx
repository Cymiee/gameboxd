import { useEffect, useState } from "react";
import { getFriendsActivityFeed } from "@gameboxd/lib";
import type { ActivityRow, UserRow, IGDBGame } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { getGames } from "../lib/igdb";
import ActivityCard from "../components/ActivityCard";

export default function FeedPage() {
  const { userId } = useAuthStore();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [users, setUsers] = useState<Map<string, Pick<UserRow, "id" | "username" | "avatar_url">>>(new Map());
  const [games, setGames] = useState<Map<number, Pick<IGDBGame, "id" | "name" | "cover">>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const feed = await getFriendsActivityFeed(supabase, userId!);
        setActivities(feed);

        if (feed.length === 0) {
          setLoading(false);
          return;
        }

        const uniqueGameIds = [...new Set(feed.map((a) => a.game_igdb_id))];
        const uniqueUserIds = [...new Set(feed.map((a) => a.user_id))];

        const [igdbGames, { data: userRows }] = await Promise.all([
          getGames(uniqueGameIds),
          supabase.from("users").select("id, username, avatar_url").in("id", uniqueUserIds),
        ]);

        const gameMap = new Map<number, Pick<IGDBGame, "id" | "name" | "cover">>();
        for (const g of igdbGames) gameMap.set(g.id, g);
        setGames(gameMap);

        const userMap = new Map<string, Pick<UserRow, "id" | "username" | "avatar_url">>();
        for (const u of userRows ?? []) userMap.set(u.id, u);
        setUsers(userMap);
      } catch (e) {
        console.error("Feed load error:", e);
        const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? JSON.stringify(e);
        setError(msg || "Failed to load feed");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", color: "var(--muted)" }}>Loading feed...</div>
    );
  }

  if (error) {
    return <div style={{ padding: "2rem", color: "#f55" }}>{error}</div>;
  }

  if (activities.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>Activity Feed</h2>
        <p style={{ color: "var(--muted)" }}>Follow friends to see their activity.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Activity Feed</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {activities.map((activity) => {
          const user = users.get(activity.user_id);
          const game = games.get(activity.game_igdb_id);
          if (!user || !game) return null;
          return (
            <ActivityCard key={activity.id} activity={activity} user={user} game={game} />
          );
        })}
      </div>
    </div>
  );
}
