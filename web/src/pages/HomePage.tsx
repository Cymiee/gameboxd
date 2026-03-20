import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import type { IGDBGame, GameLogRow, UserRow } from "@gameboxd/lib";
import { getCoverUrl, getUserGameLogs } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { getTrendingGames, getGames, getGamesByGenre } from "../lib/igdb";
import GameCard from "../components/GameCard";
import Spinner from "../components/Spinner";
import backgroundImg from "../assets/background.png";

// ── Horizontal scrollable row ───────────────────────────────────────────────

function GameRow({ games, loading }: { games: IGDBGame[]; loading: boolean }) {
  const navigate = useNavigate();
  if (loading) {
    return (
      <div style={{ height: 220, display: "flex", alignItems: "center", paddingLeft: "0.5rem" }}>
        <Spinner />
      </div>
    );
  }
  if (games.length === 0) return null;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "0.75rem",
      }}
    >
      {games.map((g) => (
        <GameCard key={g.id} game={g} onSelect={(game) => navigate(`/game/${game.id}`)} />
      ))}
    </div>
  );
}

// ── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontSize: "0.8rem",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--muted)",
        marginBottom: "1rem",
      }}
    >
      {title}
    </h2>
  );
}

// ── Review card ─────────────────────────────────────────────────────────────

interface ReviewItem {
  log: GameLogRow & { review: string };
  user: Pick<UserRow, "id" | "username">;
  game: Pick<IGDBGame, "id" | "name" | "cover">;
}

function ReviewCard({ item }: { item: ReviewItem }) {
  const excerpt =
    item.log.review.length > 140
      ? item.log.review.slice(0, 140).trimEnd() + "…"
      : item.log.review;

  return (
    <Link
      to={`/game/${item.game.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "0.9rem",
          display: "flex",
          gap: "0.75rem",
          height: "100%",
          boxSizing: "border-box",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        {item.game.cover && (
          <img
            src={getCoverUrl(item.game.cover.image_id, "thumb")}
            alt={item.game.name}
            style={{ width: 44, height: 62, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
          />
        )}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.game.name}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2, marginBottom: 6 }}>
            <span style={{ color: "var(--accent)" }}>
              {item.user.username}
            </span>
            {item.log.rating != null && (
              <span style={{ marginLeft: "0.4rem" }}>· {item.log.rating}/10</span>
            )}
          </div>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--muted)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {excerpt}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ── HomePage ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { userId } = useAuthStore();

  const [trending, setTrending] = useState<IGDBGame[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const [recommended, setRecommended] = useState<IGDBGame[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // ── Trending ──────────────────────────────────────────────────────────────
  useEffect(() => {
    getTrendingGames()
      .then(setTrending)
      .catch(() => {})
      .finally(() => setTrendingLoading(false));
  }, []);

  // ── Recommendations ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    setRecommendedLoading(true);

    async function loadRecs() {
      const logs = await getUserGameLogs(supabase, userId!);
      if (logs.length === 0) { setRecommendedLoading(false); return; }

      const loggedIds = logs.map((l) => l.game_igdb_id);
      const loggedGames = await getGames(loggedIds.slice(0, 20));

      // Tally genre frequency across logged games
      const freq = new Map<number, number>();
      for (const g of loggedGames) {
        for (const genre of g.genres ?? []) {
          freq.set(genre.id, (freq.get(genre.id) ?? 0) + 1);
        }
      }
      if (freq.size === 0) { setRecommendedLoading(false); return; }

      const topGenre = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]![0];
      const recs = await getGamesByGenre(topGenre, loggedIds);
      setRecommended(recs);
    }

    loadRecs()
      .catch(() => {})
      .finally(() => setRecommendedLoading(false));
  }, [userId]);

  // ── Popular reviews ───────────────────────────────────────────────────────
  useEffect(() => {
    async function loadReviews() {
      const { data: logRows } = await supabase
        .from("game_logs")
        .select("*")
        .not("review", "is", null)
        .order("updated_at", { ascending: false })
        .limit(6);

      if (!logRows || logRows.length === 0) { setReviewsLoading(false); return; }

      const uniqueUserIds = [...new Set(logRows.map((r) => r.user_id))];
      const uniqueGameIds = [...new Set(logRows.map((r) => r.game_igdb_id))];

      const [{ data: userRows }, gameRows] = await Promise.all([
        supabase.from("users").select("id, username").in("id", uniqueUserIds),
        getGames(uniqueGameIds),
      ]);

      const userMap = new Map((userRows ?? []).map((u) => [u.id, u]));
      const gameMap = new Map(gameRows.map((g) => [g.id, g]));

      const items: ReviewItem[] = [];
      for (const log of logRows) {
        if (!log.review) continue;
        const user = userMap.get(log.user_id);
        const game = gameMap.get(log.game_igdb_id);
        if (user && game) {
          items.push({
            log: log as GameLogRow & { review: string },
            user,
            game,
          });
        }
      }
      setReviews(items);
    }

    loadReviews()
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, []);

  return (
    <div style={{ paddingBottom: "4rem" }}>
      {/* ── Hero ── */}
      <div
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url(${backgroundImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderBottom: "1px solid var(--border)",
          padding: "3.5rem 2rem 3rem",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "Audiowide, sans-serif",
            fontSize: "2.8rem",
            color: "var(--accent)",
            margin: 0,
            letterSpacing: "0.04em",
          }}
        >
          Shelved
        </h1>
        <p style={{ color: "var(--muted)", marginTop: "0.75rem", fontSize: "1rem" }}>
          Track, rate, and discover games with your friends.
        </p>
      </div>

      <div style={{ maxWidth: 1500, margin: "0 auto", padding: "2.5rem 2rem 0" }}>

        {/* ── Trending Now ── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader title="Trending Now" />
          <GameRow games={trending} loading={trendingLoading} />
        </section>

        {/* ── You Might Like (logged-in only) ── */}
        {userId && (recommended.length > 0 || recommendedLoading) && (
          <section style={{ marginBottom: "2.5rem" }}>
            <SectionHeader title="You Might Like" />
            <GameRow games={recommended} loading={recommendedLoading} />
          </section>
        )}

        {/* ── Popular Reviews ── */}
        {(reviewsLoading || reviews.length > 0) && (
          <section style={{ marginBottom: "2.5rem" }}>
            <SectionHeader title="Popular Reviews" />
            {reviewsLoading ? (
              <div style={{ height: 120, display: "flex", alignItems: "center" }}>
                <Spinner />
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {reviews.map((item) => (
                  <ReviewCard key={item.log.id} item={item} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
