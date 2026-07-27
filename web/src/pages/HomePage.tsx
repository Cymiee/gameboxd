import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import type { IGDBGame, ActivityRow, UserRow } from "@gameboxd/lib";
import { getFriendsActivityFeed, getPopularAmongFriends, getUsersByIds } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { getTrendingGames, getGames, getNewReleases } from "../lib/igdb";
import GameCard from "../components/GameCard";
import ActivityCard from "../components/ActivityCard";
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

// ── Get-started card ─────────────────────────────────────────────────────────

/**
 * Shown to signed-in users with no friend activity yet. The first useful action
 * for a new account is logging a game, not finding friends — so Explore leads.
 */
function GetStartedCard({ hasLogs }: { hasLogs: boolean }) {
  return (
    <section
      style={{
        marginBottom: space[7],
        padding: space[6],
        background: color.bgCard,
        border: `1px solid ${color.border}`,
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div className="label" style={{ marginBottom: space[3] }}>
        Getting started
      </div>
      <h2
        style={{
          fontFamily: font.display,
          fontSize: "var(--text-xl)",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: color.text,
          margin: 0,
          marginBottom: space[2],
        }}
      >
        {hasLogs ? "Your friends' activity will show up here" : "Start your shelf"}
      </h2>
      <p
        style={{
          color: color.textSecondary,
          fontSize: "var(--text-sm)",
          lineHeight: 1.6,
          margin: 0,
          marginBottom: space[5],
          maxWidth: "52ch",
        }}
      >
        {hasLogs
          ? "Once you add friends, what they log, rate and review lands on this page."
          : "Log a game you've played to build your library — then add friends to see what they're playing."}
      </p>

      <div style={{ display: "flex", gap: space[3], flexWrap: "wrap" }}>
        <Link
          to="/explore"
          style={{
            padding: "0.6rem 1.35rem",
            background: color.accent,
            color: color.onAccent,
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            textDecoration: "none",
            transition: "background var(--transition)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = color.accentHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = color.accent)}
        >
          Explore games
        </Link>
        <Link
          to="/friends"
          style={{
            padding: "0.6rem 1.35rem",
            background: "transparent",
            border: `1px solid ${color.border}`,
            color: color.textSecondary,
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--text-sm)",
            textDecoration: "none",
            transition: "border-color var(--transition), color var(--transition)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = color.accentRing;
            e.currentTarget.style.color = color.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = color.border;
            e.currentTarget.style.color = color.textSecondary;
          }}
        >
          Find friends
        </Link>
      </div>
    </section>
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

// ── Friends activity ─────────────────────────────────────────────────────────

interface FeedItem {
  activity: ActivityRow;
  user: Pick<UserRow, "id" | "username" | "avatar_url">;
  game: Pick<IGDBGame, "id" | "name" | "cover">;
}

/** Full activity list — merged in from the former standalone /feed page. */
function FriendsActivity({ items }: { items: FeedItem[] }) {
  return (
    <div
      style={{
        display: "grid",
        // min(100%, …) keeps single-column on narrow screens instead of overflowing
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
        gap: space[3],
      }}
    >
      {items.map((item) => (
        <ActivityCard
          key={item.activity.id}
          activity={item.activity}
          user={item.user}
          game={item.game}
        />
      ))}
    </div>
  );
}

// A recent-activity preview, not the full feed. Fetch a small buffer so that
// items whose game/user fail to resolve don't leave the preview under-filled.
const HOME_ACTIVITY_LIMIT = 6;
const HOME_ACTIVITY_FETCH = 12;

// ── HomePage ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { userId, profile } = useAuthStore();
  const { logGame, logs, fetchLogs } = useGamesStore();
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

  // Own logs — only used to tailor the get-started copy
  useEffect(() => {
    if (!userId) return;
    void fetchLogs();
  }, [userId, fetchLogs]);

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
      // Home shows a compact preview of recent activity, not the whole feed —
      // otherwise the section grows with every friend action and buries the
      // discovery shelves below it. Fetch a small buffer; render fewer.
      const feed = await getFriendsActivityFeed(supabase, userId!, HOME_ACTIVITY_FETCH);
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
      setFriendsFeed(items.slice(0, HOME_ACTIVITY_LIMIT));
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
  const hasActivity = friendsFeed.length > 0;

  return (
    <div style={{ paddingBottom: "4rem" }}>
      {/* ── Hero — signed-out only. Signed in, friend activity leads instead. ──
          Flat gradient + faint amber bloom rather than art: the old illustration
          was lime-green and fought the amber accent (and weighed 2.9 MB). */}
      {!userId && (
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          isolation: "isolate",
          backgroundImage:
            "radial-gradient(circle, rgba(224, 168, 46, 0.045) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          borderBottom: "1px solid var(--border)",
          height: isMobile ? 340 : 440,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 1.5rem",
        }}
      >
        {/* Animated ambient backdrop */}
        <div className="aurora" style={{ zIndex: 0 }} />

        <div
          className="stagger"
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span className="label" style={{ marginBottom: space[4] }}>
            Your game library
          </span>
          <h1
            className="grad-text"
            style={{
              fontFamily: font.display,
              fontSize: isMobile ? "3rem" : "var(--text-display)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
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
              className="press"
              to={userId ? `/profile/${userId}` : "/auth"}
              style={{
                display: "inline-block",
                padding: "0.8rem 2rem",
                background: "var(--grad-brand)",
                color: color.onAccent,
                borderRadius: "var(--radius-full)",
                fontWeight: 600,
                fontSize: "var(--text-base)",
                fontFamily: font.body,
                letterSpacing: "0.01em",
                textDecoration: "none",
                boxShadow: "var(--glow-soft)",
                transition: "box-shadow var(--transition), filter var(--transition)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.08)"; e.currentTarget.style.boxShadow = "var(--glow-accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; e.currentTarget.style.boxShadow = "var(--glow-soft)"; }}
            >
              Start your shelf
            </Link>
          </div>
        </div>
      </div>
      )}

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "1.5rem 16px 0" : "2.5rem 24px 0" }}>

        {/* ── Friend activity leads — but only once there is any. With an empty
               feed it would push the useful content below the fold, so
               discovery leads instead and the prompt moves underneath. ── */}
        {userId && hasActivity && (
          <section style={{ marginBottom: space[7] }}>
            <ShelfHeader title="From Your Friends" count={friendsFeed.length} />
            <FriendsActivity items={friendsFeed} />
          </section>
        )}

        {userId && friendsFeedLoading && (
          <section style={{ marginBottom: space[7] }}>
            <ShelfHeader title="From Your Friends" />
            <div style={{ height: 120, display: "flex", alignItems: "center" }}>
              <Spinner />
            </div>
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

        {/* Nothing to catch up on yet — point at the first useful action */}
        {userId && !friendsFeedLoading && !hasActivity && (
          <GetStartedCard hasLogs={logs.length > 0} />
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
