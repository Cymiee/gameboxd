import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import type { IGDBGame, ActivityRow, UserRow } from "@gameboxd/lib";
import { getFriendsActivityFeed, getPopularAmongFriends, getUsersByIds, GENRE_IGDB_MAP } from "@gameboxd/lib";
import type { GenreTag } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { getTrendingGames, getGames, getGame, getNewReleases, getGamesByTags } from "../lib/igdb";
import GameCard from "../components/GameCard";
import ActivityCard from "../components/ActivityCard";
import RecommendationRow from "../components/RecommendationRow";
import FeaturedHero from "../components/FeaturedHero";
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

/** Recent friend activity — a single horizontally-scrollable row of cards. */
function FriendsActivity({ items }: { items: FeedItem[] }) {
  return (
    <div
      className="no-scrollbar stagger"
      style={{
        display: "flex",
        gap: space[3],
        overflowX: "auto",
        paddingBottom: space[2],
        scrollSnapType: "x proximity",
      }}
    >
      {items.map((item) => (
        <div
          key={item.activity.id}
          style={{ flex: "0 0 300px", minWidth: 0, scrollSnapAlign: "start" }}
        >
          <ActivityCard activity={item.activity} user={item.user} game={item.game} />
        </div>
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
  const { userId, profile, profileTags } = useAuthStore();
  const { logGame, logs, fetchLogs } = useGamesStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [recommended, setRecommended] = useState<IGDBGame[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  // "Because you loved X" — seeded by the user's highest-rated logged game.
  const [seedGame, setSeedGame] = useState<IGDBGame | null>(null);
  const [seedRecs, setSeedRecs] = useState<IGDBGame[]>([]);

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

  // Genre-based suggestions — driven by onboarding picks PLUS genres learned
  // from games the user has rated highly.
  const suggestionGenres = [...new Set([...(profileTags?.genres ?? []), ...(profileTags?.played_genres ?? [])])];
  const genresKey = suggestionGenres.join(",");
  useEffect(() => {
    if (!userId || suggestionGenres.length === 0) { setRecommended([]); return; }

    const genreIds = [...new Set(suggestionGenres.flatMap((g) => GENRE_IGDB_MAP[g as GenreTag]?.genres ?? []))];
    const themeIds = [...new Set(suggestionGenres.flatMap((g) => GENRE_IGDB_MAP[g as GenreTag]?.themes ?? []))];

    setRecommendedLoading(true);
    getGamesByTags(genreIds, themeIds, [], 24)
      .then(setRecommended)
      .catch(() => {})
      .finally(() => setRecommendedLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, genresKey]);

  // Seed "Because you loved X" from the user's highest-rated logged game.
  const topRatedLog = [...logs].filter((l) => (l.rating ?? 0) >= 8).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
  const seedId = topRatedLog?.game_igdb_id ?? null;
  useEffect(() => {
    if (!seedId) { setSeedGame(null); setSeedRecs([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const seed = await getGame(seedId);
        if (cancelled) return;
        setSeedGame(seed);
        const ids = seed.similar_games ?? [];
        const games = ids.length > 0 ? await getGames(ids) : [];
        if (!cancelled) setSeedRecs(games);
      } catch {
        if (!cancelled) { setSeedGame(null); setSeedRecs([]); }
      }
    })();
    return () => { cancelled = true; };
  }, [seedId]);

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

  // Cinematic featured hero — the most hyped current title with wide art.
  const featured = trending.find((g) => g.artworks?.length || g.screenshots?.length) ?? trending[0] ?? newReleases[0] ?? null;

  // Don't suggest games the user has already logged.
  const loggedIds = new Set(logs.map((l) => l.game_igdb_id));
  const recommendedFresh = recommended.filter((g) => !loggedIds.has(g.id));
  const seedRecsFresh = seedRecs.filter((g) => !loggedIds.has(g.id));
  const hasGenres = suggestionGenres.length > 0;

  return (
    <div style={{ paddingBottom: "4rem" }}>
      {/* ── Cinematic featured hero — large artwork fading into the page ── */}
      {featured && (
        <FeaturedHero
          game={featured}
          ctaLabel={userId ? "Learn More" : "Start your shelf"}
          ctaTo={userId ? `/game/${featured.id}` : "/auth"}
        />
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

        {/* Personalised discovery leads. "Because you loved X" (seeded by a
            top-rated log) takes priority; otherwise fall back to genre-based. */}
        {userId && seedGame && seedRecsFresh.length > 0 ? (
          <RecommendationRow seed={seedGame} games={seedRecsFresh} onQuickLog={handleQuickLog} />
        ) : (
          userId && hasGenres && (recommendedLoading || recommendedFresh.length > 0) && (
            <GameShelf
              title="Based on Your Genres"
              games={recommendedFresh}
              loading={recommendedLoading}
              onQuickLog={handleQuickLog}
            />
          )
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
            await logGame(
              quickLogGame.id,
              status,
              rating ?? undefined,
              review ?? undefined,
              (quickLogGame.genres ?? []).map((g) => g.id),
            );
            navigate(`/game/${quickLogGame.id}`);
          }}
        />
      )}
    </div>
  );
}
