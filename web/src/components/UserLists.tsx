import { useEffect, useState } from "react";
import type { ListWithMeta, IGDBGame } from "@gameboxd/lib";
import { getListsByUser, createList } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { getGames } from "../lib/igdb";
import ListCard from "./ListCard";
import ListFormModal from "./ListFormModal";
import Spinner from "./Spinner";

interface Props {
  userId: string;
  isOwn: boolean;
}

/** The Lists tab body: a user's lists as cards, with a create action if own. */
export default function UserLists({ userId, isOwn }: Props) {
  const [lists, setLists] = useState<ListWithMeta[]>([]);
  const [games, setGames] = useState<Map<number, IGDBGame>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const userLists = await getListsByUser(supabase, userId);
        if (cancelled) return;
        setLists(userLists);

        const coverIds = [...new Set(userLists.flatMap((l) => l.coverGameIds))];
        if (coverIds.length > 0) {
          const gameList = await getGames(coverIds);
          if (cancelled) return;
          setGames(new Map(gameList.map((g) => [g.id, g])));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const handleCreate = async (title: string, description: string | null) => {
    await createList(supabase, userId, title, description ?? undefined);
    const userLists = await getListsByUser(supabase, userId);
    setLists(userLists);
  };

  if (loading) {
    return (
      <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      {isOwn && (
        <button
          onClick={() => setShowCreate(true)}
          style={{
            marginBottom: "var(--space-5)",
            padding: "0.55rem 1.15rem",
            background: "var(--accent)",
            border: "none",
            color: "var(--on-accent)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            transition: "background var(--transition)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
        >
          + New list
        </button>
      )}

      {lists.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          {isOwn ? "You haven't made any lists yet." : "No lists yet."}
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {lists.map((list) => (
            <ListCard key={list.id} list={list} games={games} />
          ))}
        </div>
      )}

      {showCreate && (
        <ListFormModal onClose={() => setShowCreate(false)} onSave={handleCreate} />
      )}
    </div>
  );
}
