import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { ListWithGames, IGDBGame } from "@gameboxd/lib";
import {
  getListWithGames,
  updateList,
  deleteList,
  removeGameFromList,
} from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { getGames } from "../lib/igdb";
import { useAuthStore } from "../store/auth";
import { PageSpinner } from "../components/Spinner";
import GameCover from "../components/GameCover";
import ListFormModal from "../components/ListFormModal";

export default function ListPage() {
  const { id } = useParams<{ id: string }>();
  const { userId } = useAuthStore();
  const navigate = useNavigate();

  const [list, setList] = useState<ListWithGames | null>(null);
  const [games, setGames] = useState<Map<number, IGDBGame>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [busy, setBusy] = useState(false);

  const isOwner = list != null && userId === list.user_id;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const l = await getListWithGames(supabase, id!);
        if (cancelled) return;
        setList(l);
        if (l.games.length > 0) {
          const gameList = await getGames(l.games.map((g) => g.game_igdb_id));
          if (cancelled) return;
          setGames(new Map(gameList.map((g) => [g.id, g])));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load list");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleEdit = async (title: string, description: string | null) => {
    if (!list) return;
    const updated = await updateList(supabase, list.id, { title, description });
    setList({ ...list, ...updated });
  };

  const handleDelete = async () => {
    if (!list || !window.confirm("Delete this list? This can't be undone.")) return;
    setBusy(true);
    try {
      await deleteList(supabase, list.id);
      navigate(`/profile/${list.user_id}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveGame = async (gameIgdbId: number) => {
    if (!list) return;
    setBusy(true);
    try {
      await removeGameFromList(supabase, list.id, gameIgdbId);
      setList({ ...list, games: list.games.filter((g) => g.game_igdb_id !== gameIgdbId) });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageSpinner />;
  if (error) return <div style={{ padding: "2rem", color: "var(--danger)" }}>{error}</div>;
  if (!list) return null;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2.5rem clamp(16px, 3vw, 24px) 4rem" }}>
      {/* Header */}
      <header style={{ marginBottom: "var(--space-7)" }}>
        <div className="label" style={{ marginBottom: "var(--space-2)" }}>List</div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-2xl)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {list.title}
        </h1>
        {list.description && (
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", lineHeight: 1.6, marginTop: "var(--space-3)", maxWidth: "68ch" }}>
            {list.description}
          </p>
        )}
        <div style={{ marginTop: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          <Link to={`/profile/${list.user_id}`} style={{ color: "var(--accent)" }}>{list.user.username}</Link>
          {" · "}
          {list.games.length} {list.games.length === 1 ? "game" : "games"}
        </div>

        {isOwner && (
          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)", flexWrap: "wrap" }}>
            <button onClick={() => setShowEdit(true)} disabled={busy} style={ownerBtn}>Edit</button>
            <button onClick={handleDelete} disabled={busy} style={{ ...ownerBtn, color: "var(--danger)" }}>Delete list</button>
          </div>
        )}
      </header>

      {/* Games grid */}
      {list.games.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          No games in this list yet.
          {isOwner && " Add games from any game's page."}
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(45%, 116px), 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {list.games.map((entry) => {
            const game = games.get(entry.game_igdb_id);
            return (
              <div key={entry.id} style={{ position: "relative" }}>
                <GameCover
                  name={game?.name ?? "Game"}
                  imageId={game?.cover?.image_id}
                  rounding="md"
                  interactive
                  onClick={() => navigate(`/game/${entry.game_igdb_id}`)}
                />
                {isOwner && (
                  <button
                    onClick={() => handleRemoveGame(entry.game_igdb_id)}
                    disabled={busy}
                    aria-label={`Remove ${game?.name ?? "game"} from list`}
                    style={{
                      position: "absolute",
                      top: 5,
                      right: 5,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.78)",
                      border: "none",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      fontSize: "0.7rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showEdit && (
        <ListFormModal
          initial={{ title: list.title, description: list.description }}
          onClose={() => setShowEdit(false)}
          onSave={handleEdit}
        />
      )}
    </div>
  );
}

const ownerBtn: React.CSSProperties = {
  padding: "0.45rem 1rem",
  background: "none",
  border: "1px solid var(--border)",
  color: "var(--text-secondary)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontSize: "var(--text-sm)",
};
