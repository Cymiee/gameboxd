import { useEffect, useState } from "react";
import type { ListWithMeta } from "@gameboxd/lib";
import { getListsByUser, createList, addGameToList } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import Spinner from "./Spinner";
import ListFormModal from "./ListFormModal";

interface Props {
  userId: string;
  gameIgdbId: number;
  gameName: string;
  onClose: () => void;
}

type RowStatus = "idle" | "adding" | "added" | "exists";

/** Pick an existing list to add a game to, or create a new one. */
export default function AddToListModal({ userId, gameIgdbId, gameName, onClose }: Props) {
  const [lists, setLists] = useState<ListWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Map<string, RowStatus>>(new Map());
  const [showCreate, setShowCreate] = useState(false);

  const setRow = (listId: string, s: RowStatus) =>
    setStatus((prev) => new Map(prev).set(listId, s));

  useEffect(() => {
    let cancelled = false;
    getListsByUser(supabase, userId)
      .then((l) => { if (!cancelled) setLists(l); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const handleAdd = async (listId: string) => {
    setRow(listId, "adding");
    try {
      await addGameToList(supabase, listId, gameIgdbId);
      setRow(listId, "added");
    } catch (e) {
      // The (list_id, game_igdb_id) unique constraint means it's already there.
      const msg = e instanceof Error ? e.message : "";
      setRow(listId, /duplicate|unique/i.test(msg) ? "exists" : "idle");
    }
  };

  const handleCreateAndAdd = async (title: string, description: string | null) => {
    const list = await createList(supabase, userId, title, description ?? undefined);
    await addGameToList(supabase, list.id, gameIgdbId);
    const refreshed = await getListsByUser(supabase, userId);
    setLists(refreshed);
    setRow(list.id, "added");
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          width: "min(440px, 100%)",
          maxHeight: "90dvh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, letterSpacing: "-0.01em" }}>
            Add to list
          </h2>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>{gameName}</p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "0.6rem 1rem",
            background: "var(--accent-dim)",
            border: "1px solid var(--accent-ring)",
            color: "var(--accent)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            textAlign: "left",
          }}
        >
          + New list
        </button>

        {loading ? (
          <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Spinner />
          </div>
        ) : lists.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
            You have no lists yet — create one above.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {lists.map((list) => {
              const s = status.get(list.id) ?? "idle";
              const done = s === "added" || s === "exists";
              return (
                <button
                  key={list.id}
                  onClick={() => s === "idle" && handleAdd(list.id)}
                  disabled={s !== "idle"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "var(--space-3)",
                    padding: "0.6rem 0.85rem",
                    background: "var(--bg-inset)",
                    border: `1px solid ${done ? "var(--accent-ring)" : "var(--border)"}`,
                    borderRadius: "var(--radius-sm)",
                    cursor: s === "idle" ? "pointer" : "default",
                    fontSize: "var(--text-sm)",
                    color: "var(--text-primary)",
                    textAlign: "left",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {list.title}
                    <span style={{ color: "var(--text-muted)", marginLeft: 6, fontSize: "var(--text-xs)" }}>
                      {list.gameCount}
                    </span>
                  </span>
                  <span style={{ flexShrink: 0, fontSize: "var(--text-xs)", color: done ? "var(--accent)" : "var(--text-muted)" }}>
                    {s === "adding" ? "…" : s === "added" ? "Added ✓" : s === "exists" ? "In list" : "Add"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.6rem 1.25rem",
              background: "none",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontSize: "var(--text-sm)",
            }}
          >
            Done
          </button>
        </div>
      </div>

      {showCreate && (
        <ListFormModal onClose={() => setShowCreate(false)} onSave={handleCreateAndAdd} />
      )}
    </div>
  );
}
