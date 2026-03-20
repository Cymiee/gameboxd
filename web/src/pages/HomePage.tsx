import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import type { IGDBGame, ActivityRow, UserRow } from "@gameboxd/lib";
import { getCoverUrl, getFriendsActivityFeed, getPopularAmongFriends } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { getTrendingGames, getGames, getNewReleases } from "../lib/igdb";
import GameCard from "../components/GameCard";
import LogGameModal from "../components/LogGameModal";
import Spinner from "../components/Spinner";
import { useGamesStore } from "../store/games";
import backgroundImg from "../assets/background.png";

// ── Horizontal scroll row ────────────────────────────────────────────────────

function HScrollRow({ games, loading, onQuickLog }: {
  games: IGDBGame[];
  loading: boolean;
  onQuickLog?: (game: IGDBGame) => void;
}) {
  const navigate = useNavigate();
  if (loading) {
    return (
      <div style={{ height: 200, display: "flex", alignItems: "center", paddingLeft: "0.5rem" }}>
        <Spinner />
      </div>
    );
  }
  if (games.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        overflowX: "auto",
        paddingBottom: "0.5rem",
        scrollbarWidth: "none",
      }}
    >
      {games.map((g) => (
        <div key={g.id} style={{ flex: "0 0 140px" }}>
          <GameCard
            game={g}
            onSelect={(game) => navigate(`/game/${game.id}`)}
            {...(onQuickLog ? { onQuickLog } : {})}
          />
        </div>
      ))}
    </div>
  );
}

// ── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
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
      {title}
    </h2>
  );
}

// ── timeAgo helper ───────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Friends activity strip ────────────────────────────────────────────────────

interface FeedItem {
  activity: ActivityRow;
  user: Pick<UserRow, "id" | "username">;
  game: Pick<IGDBGame, "id" | "name" | "cover">;
}

function FriendsStrip({ items }: { items: FeedItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      style={{
        display: "flex",
        gap: "0.75rem",
        overflowX: "auto",
        paddingBottom: "0.5rem",
        scrollbarWidth: "none",
      }}
    >
      {items.map((item) => (
        <Link
          key={item.activity.id}
          to={`/game/${item.game.id}`}
          style={{
            flex: "0 0 auto",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            textDecoration: "none",
            minWidth: 220,
            maxWidth: 260,
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          {/* Avatar */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--accent)",
              color: "#0e0e10",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.75rem",
              flexShrink: 0,
              fontFamily: "Syne, sans-serif",
            }}
          >
            {item.user.username[0]?.toUpperCase()}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.8rem",
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontWeight: 600 }}>{item.user.username}</span>
              {" "}
              <span style={{ color: "var(--muted)" }}>
                {item.activity.type === "rated" ? "rated" :
                 item.activity.type === "reviewed" ? "reviewed" :
                 item.activity.type === "topped" ? "topped" : "logged"}
              </span>
              {" "}
              <span style={{ fontWeight: 500 }}>{item.game.name}</span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>
              {timeAgo(item.activity.created_at)}
            </div>
          </div>

          {/* Game cover */}
          {item.game.cover && (
            <img
              src={getCoverUrl(item.game.cover.image_id, "thumb")}
              alt={item.game.name}
              style={{ width: 28, height: 40, objectFit: "cover", borderRadius: 3, flexShrink: 0 }}
            />
          )}
        </Link>
      ))}
    </div>
  );
}

// ── HomePage ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { userId, profile } = useAuthStore();
  const { logGame } = useGamesStore();
  const navigate = useNavigate();

  const [trending, setTrending] = useState<IGDBGame[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const [newReleases, setNewReleases] = useState<IGDBGame[]>([]);
  const [newReleasesLoading, setNewReleasesLoading] = useState(true);

  const [friendsFeed, setFriendsFeed] = useState<FeedItem[]>([]);
  const [friendsFeedLoading, setFriendsFeedLoading] = useState(false);

  const [popularFriends, setPopularFriends] = useState<IGDBGame[]>([]);
  const [popularFriendsLoading, setPopularFriendsLoading] = useState(false);

  const [quickLogGame, setQuickLogGame] = useState<IGDBGame | null>(null);

  // Trending
  useEffect(() => {
    getTrendingGames()
      .then((g) => setTrending(g.slice(0, 7)))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));
  }, []);

  // New releases
  useEffect(() => {
    getNewReleases(7)
      .then(setNewReleases)
      .catch(() => {})
      .finally(() => setNewReleasesLoading(false));
  }, []);

  // Friends feed & popular (logged-in only)
  useEffect(() => {
    if (!userId) return;

    setFriendsFeedLoading(true);
    async function loadFriendsFeed() {
      const feed = await getFriendsActivityFeed(supabase, userId!, 10);
      if (feed.length === 0) { setFriendsFeedLoading(false); return; }

      const uniqueGameIds = [...new Set(feed.map((a) => a.game_igdb_id))];
      const uniqueUserIds = [...new Set(feed.map((a) => a.user_id))];

      const [igdbGames, { data: userRows }] = await Promise.all([
        getGames(uniqueGameIds),
        supabase.from("users").select("id, username").in("id", uniqueUserIds),
      ]);

      const gameMap = new Map(igdbGames.map((g) => [g.id, g]));
      const userMap = new Map((userRows ?? []).map((u) => [u.id, u]));

      const items: FeedItem[] = [];
      for (const activity of feed) {
        const user = userMap.get(activity.user_id);
        const game = gameMap.get(activity.game_igdb_id);
        if (user && game) items.push({ activity, user, game });
      }
      setFriendsFeed(items);
    }

    loadFriendsFeed()
      .catch(() => {})
      .finally(() => setFriendsFeedLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    setPopularFriendsLoading(true);
    async function loadPopular() {
      const entries = await getPopularAmongFriends(supabase, userId!);
      if (entries.length === 0) { setPopularFriendsLoading(false); return; }
      const ids = entries.map((e) => e.gameIgdbId);
      const games = await getGames(ids);
      setPopularFriends(games);
    }

    loadPopular()
      .catch(() => {})
      .finally(() => setPopularFriendsLoading(false));
  }, [userId]);

  const handleQuickLog = (game: IGDBGame) => setQuickLogGame(game);

  return (
    <div style={{ paddingBottom: "4rem" }}>
      {/* ── Hero ── */}
      <div
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url(${backgroundImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderBottom: "1px solid var(--border)",
          height: 420,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 2rem",
        }}
      >
        <h1
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: "clamp(3rem, 6vw, 4.5rem)",
            fontWeight: 800,
            color: "#fff",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Shelved
        </h1>
        <p
          style={{
            color: "#a1a1aa",
            marginTop: "1rem",
            fontSize: "1.1rem",
            fontWeight: 400,
            maxWidth: 420,
          }}
        >
          Track, rate, and discover games with your friends.
        </p>
        <div style={{ marginTop: "1.75rem" }}>
          {!userId ? (
            <Link
              to="/auth"
              style={{
                display: "inline-block",
                padding: "0.7rem 1.75rem",
                background: "var(--accent)",
                color: "#0e0e10",
                borderRadius: 999,
                fontWeight: 700,
                fontSize: "0.95rem",
                fontFamily: "Syne, sans-serif",
                textDecoration: "none",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Start tracking
            </Link>
          ) : (
            <Link
              to={`/profile/${userId}`}
              style={{
                display: "inline-block",
                padding: "0.7rem 1.75rem",
                background: "var(--accent)",
                color: "#0e0e10",
                borderRadius: 999,
                fontWeight: 700,
                fontSize: "0.95rem",
                fontFamily: "Syne, sans-serif",
                textDecoration: "none",
              }}
            >
              Go to your profile
            </Link>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2.5rem 24px 0" }}>

        {/* ── Friends Activity Strip ── */}
        {userId && (friendsFeedLoading || friendsFeed.length > 0) && (
          <section style={{ marginBottom: "2.5rem" }}>
            <SectionHeader title="From Your Friends" />
            {friendsFeedLoading ? (
              <div style={{ height: 80, display: "flex", alignItems: "center" }}>
                <Spinner />
              </div>
            ) : (
              <FriendsStrip items={friendsFeed} />
            )}
          </section>
        )}

        {/* ── Trending Now ── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader title="Trending Now" />
          <HScrollRow games={trending} loading={trendingLoading} {...(userId ? { onQuickLog: handleQuickLog } : {})} />
        </section>

        {/* ── New Releases ── */}
        {(newReleasesLoading || newReleases.length > 0) && (
          <section style={{ marginBottom: "2.5rem" }}>
            <SectionHeader title="New Releases" />
            <HScrollRow games={newReleases} loading={newReleasesLoading} {...(userId ? { onQuickLog: handleQuickLog } : {})} />
          </section>
        )}

        {/* ── Popular Among Friends ── */}
        {userId && (popularFriendsLoading || popularFriends.length > 0) && (
          <section style={{ marginBottom: "2.5rem" }}>
            <SectionHeader title="Popular With Your Friends" />
            <HScrollRow games={popularFriends} loading={popularFriendsLoading} onQuickLog={handleQuickLog} />
          </section>
        )}
      </div>

      {/* ── Quick-log modal ── */}
      {quickLogGame && (
        <LogGameModal
          game={quickLogGame}
          onClose={() => setQuickLogGame(null)}
          onSave={async (status, rating, review) => {
            await logGame(quickLogGame.id, status, rating ?? undefined, review ?? undefined);
            navigate(`/game/${quickLogGame.id}`);
          }}
        />
      )}
    </div>
  );
}
