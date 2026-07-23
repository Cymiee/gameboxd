import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import type { IGDBGame, ActivityRow, UserRow } from "@gameboxd/lib";
import { getFriendsActivityFeed, getPopularAmongFriends, getUsersByIds } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { getTrendingGames, getGames, getNewReleases } from "../lib/igdb";
import GameCard from "../components/GameCard";
import GameCover from "../components/GameCover";
import LogGameModal from "../components/LogGameModal";
import Spinner from "../components/Spinner";
import Shelf, { ShelfHeader } from "../components/Shelf";
import { useGamesStore } from "../store/games";
import { useIsMobile } from "../hooks/useIsMobile";
import { color, font, space } from "../theme";

// ── Shelf of game covers ─────────────────────────────────────────────────────

function GameShelf({ title, games, loading, onQuickLog }: {
  title: string;
  games: IGDBGame[];
  loading: boolean;
  onQuickLog?: (game: IGDBGame) => void;
}) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <section style={{ marginBottom: space[7] }}>
        <ShelfHeader title={title} />
        <div style={{ height: 200, display: "flex", alignItems: "center" }}>
          <Spinner />
        </div>
      </section>
    );
  }
  if (games.length === 0) return null;

  return (
    <Shelf title={title} count={games.length} itemWidth={isMobile ? 128 : 168}>
      {games.map((g) => (
        <GameCard
          key={g.id}
          game={g}
          onSelect={(game) => navigate(`/game/${game.id}`)}
          {...(onQuickLog ? { onQuickLog } : {})}
        />
      ))}
    </Shelf>
  );
}

// ── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "0.72rem",
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
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
      className="no-scrollbar"
      style={{
        display: "flex",
        gap: space[3],
        overflowX: "auto",
        paddingBottom: space[2],
      }}
    >
      {items.map((item) => (
        <Link
          key={item.activity.id}
          to={`/game/${item.game.id}`}
          style={{
            flex: "0 0 auto",
            background: color.bgCard,
            border: `1px solid ${color.border}`,
            borderRadius: "var(--radius-md)",
            padding: space[3],
            display: "flex",
            alignItems: "center",
            gap: space[3],
            textDecoration: "none",
            minWidth: 230,
            maxWidth: 270,
            transition: "border-color var(--transition)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = color.accentRing)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = color.border)}
        >
          {/* Avatar */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: color.accentDim,
              border: `1px solid ${color.accentRing}`,
              color: color.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: "var(--text-xs)",
              flexShrink: 0,
              fontFamily: font.display,
            }}
          >
            {item.user.username[0]?.toUpperCase()}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "var(--text-sm)",
                color: color.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontWeight: 600 }}>{item.user.username}</span>
              {" "}
              <span style={{ color: color.textMuted }}>
                {item.activity.type === "rated" ? "rated" :
                 item.activity.type === "reviewed" ? "reviewed" :
                 item.activity.type === "topped" ? "topped" : "logged"}
              </span>
              {" "}
              <span style={{ fontWeight: 500, fontFamily: font.display }}>{item.game.name}</span>
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: color.textMuted, marginTop: 2 }}>
              {timeAgo(item.activity.created_at)}
            </div>
          </div>

          {/* Game cover */}
          <div style={{ width: 30, flexShrink: 0 }}>
            <GameCover
              name={item.game.name}
              imageId={item.game.cover?.image_id}
              size="thumb"
              rounding="sm"
            />
          </div>
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
  const isMobile = useIsMobile();

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

      const [igdbGames, userRows] = await Promise.all([
        getGames(uniqueGameIds),
        getUsersByIds(supabase, uniqueUserIds),
      ]);

      const gameMap = new Map(igdbGames.map((g) => [g.id, g]));
      const userMap = new Map(userRows.map((u) => [u.id, u]));

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
      {/* ── Hero ──
          Flat gradient + faint amber bloom rather than art: the old illustration
          was lime-green and fought the amber accent (and weighed 2.9 MB). */}
      <div
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(224, 168, 46, 0.10), transparent 70%), " +
            "radial-gradient(circle, rgba(224, 168, 46, 0.045) 1px, transparent 1px)",
          backgroundSize: "auto, 30px 30px",
          borderBottom: "1px solid var(--border)",
          height: isMobile ? 320 : 420,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 1.5rem",
        }}
      >
        <span className="label" style={{ marginBottom: space[4] }}>
          Your game library
        </span>
        <h1
          style={{
            fontFamily: font.display,
            fontSize: isMobile ? "2.75rem" : "var(--text-display)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: color.text,
            margin: 0,
            lineHeight: 1.05,
          }}
        >
          Shelved
        </h1>
        <p
          style={{
            color: color.textSecondary,
            marginTop: space[4],
            fontSize: "var(--text-lg)",
            fontWeight: 400,
            maxWidth: 440,
            lineHeight: 1.55,
          }}
        >
          Track, rate, and discover games with your friends.
        </p>
        <div style={{ marginTop: space[6] }}>
          <Link
            to={userId ? `/profile/${userId}` : "/auth"}
            style={{
              display: "inline-block",
              padding: "0.75rem 1.85rem",
              background: color.accent,
              color: color.onAccent,
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              fontSize: "var(--text-sm)",
              fontFamily: font.body,
              letterSpacing: "0.01em",
              textDecoration: "none",
              transition: "background var(--transition)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = color.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = color.accent)}
          >
            {userId ? "Go to your shelf" : "Start your shelf"}
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "1.5rem 16px 0" : "2.5rem 24px 0" }}>

        {/* ── Friends Activity Strip ── */}
        {userId && (friendsFeedLoading || friendsFeed.length > 0) && (
          <section style={{ marginBottom: space[7] }}>
            <ShelfHeader title="From Your Friends" />
            {friendsFeedLoading ? (
              <div style={{ height: 80, display: "flex", alignItems: "center" }}>
                <Spinner />
              </div>
            ) : (
              <FriendsStrip items={friendsFeed} />
            )}
          </section>
        )}

        <GameShelf
          title="Trending Now"
          games={trending}
          loading={trendingLoading}
          {...(userId ? { onQuickLog: handleQuickLog } : {})}
        />

        <GameShelf
          title="New Releases"
          games={newReleases}
          loading={newReleasesLoading}
          {...(userId ? { onQuickLog: handleQuickLog } : {})}
        />

        {userId && (
          <GameShelf
            title="Popular With Your Friends"
            games={popularFriends}
            loading={popularFriendsLoading}
            onQuickLog={handleQuickLog}
          />
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
