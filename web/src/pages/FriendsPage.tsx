import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { UserRow, FriendshipRow, UserProfileTagsRow } from "@gameboxd/lib";
import {
  getFriends,
  getPendingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  getUsersByIds,
  getUserByUsername,
  getProfileTagsByIds,
  ARCHETYPES,
  GENRE_LABELS,
} from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { useNotificationsStore } from "../store/notifications";
import Avatar from "../components/Avatar";

const ARCH_BY_ID = new Map<string, (typeof ARCHETYPES)[number]>(ARCHETYPES.map((a) => [a.id, a]));
const genreLabel = (g: string) => GENRE_LABELS[g as keyof typeof GENRE_LABELS] ?? g;

/** A friend's "vibe": top archetype + a couple genres, plus shared-taste count. */
function FriendVibe({
  tags,
  myTags,
  bio,
}: {
  tags: UserProfileTagsRow | undefined;
  myTags: UserProfileTagsRow | null;
  bio: string | null;
}) {
  const arch = tags?.archetypes[0] ? ARCH_BY_ID.get(tags.archetypes[0]) : undefined;
  const genres = (tags?.genres ?? []).slice(0, 2);
  const shared = myTags && tags
    ? tags.genres.filter((g) => myTags.genres.includes(g)).length +
      tags.archetypes.filter((a) => myTags.archetypes.includes(a)).length
    : 0;

  if (!arch && genres.length === 0) {
    return bio ? (
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {bio}
      </p>
    ) : null;
  }

  const chip: React.CSSProperties = {
    padding: "1px 8px",
    borderRadius: "var(--radius-full)",
    fontSize: "0.7rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4, alignItems: "center" }}>
      {arch && (
        <span style={{ ...chip, background: "var(--bg-inset)", border: "1px solid var(--border-strong)", color: "var(--text-primary)" }}>
          {arch.emoji} {arch.label}
        </span>
      )}
      {genres.map((g) => (
        <span key={g} style={{ ...chip, background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", fontWeight: 500 }}>
          {genreLabel(g)}
        </span>
      ))}
      {shared > 0 && (
        <span style={{ ...chip, background: "var(--accent-dim)", border: "1px solid var(--accent-ring)", color: "var(--accent)" }}>
          ★ {shared} shared
        </span>
      )}
    </div>
  );
}

type Tab = "friends" | "pending";

export default function FriendsPage() {
  const { userId } = useAuthStore();
  const setPending = useNotificationsStore((s) => s.setPending);
  const [tab, setTab] = useState<Tab>("friends");

  const [friendProfiles, setFriendProfiles] = useState<UserRow[]>([]);
  const [friendTags, setFriendTags] = useState<Map<string, UserProfileTagsRow>>(new Map());
  const [pendingRequests, setPendingRequests] = useState<FriendshipRow[]>([]);
  const [requesterProfiles, setRequesterProfiles] = useState<Map<string, UserRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const myTags = useAuthStore((s) => s.profileTags);

  const [addUsername, setAddUsername] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function loadData() {
    if (!userId) return;
    setLoading(true);
    try {
      const [friendIds, pending] = await Promise.all([
        getFriends(supabase, userId),
        getPendingRequests(supabase, userId),
      ]);

      setFriendProfiles(await getUsersByIds(supabase, friendIds));

      // Each friend's taste tags, for the vibe chips on their card.
      if (friendIds.length > 0) {
        const tags = await getProfileTagsByIds(supabase, friendIds);
        setFriendTags(new Map(tags.map((t) => [t.user_id, t])));
      } else {
        setFriendTags(new Map());
      }

      setPendingRequests(pending);
      setPending(pending.length); // keep the nav badge in sync

      if (pending.length > 0) {
        const requesterIds = pending.map((p) => p.requester_id);
        const requesters = await getUsersByIds(supabase, requesterIds);
        const m = new Map<string, UserRow>();
        for (const u of requesters) m.set(u.id, u);
        setRequesterProfiles(m);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = async (friendship: FriendshipRow) => {
    if (!userId) return;
    await acceptFriendRequest(supabase, friendship.id, userId);
    await loadData();
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !addUsername.trim()) return;
    setAddError(null);
    setAddSuccess(null);
    setAdding(true);
    try {
      const target = await getUserByUsername(supabase, addUsername.trim());

      if (!target) {
        setAddError(`No user found with username "${addUsername.trim()}"`);
        return;
      }
      if (target.id === userId) {
        setAddError("You can't add yourself.");
        return;
      }

      await sendFriendRequest(supabase, userId, target.id);
      setAddSuccess(`Friend request sent to ${target.username}!`);
      setAddUsername("");
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to send request");
    } finally {
      setAdding(false);
    }
  };

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: "0.5rem 1.25rem",
    background: tab === t ? "var(--accent-dim)" : "none",
    border: `1px solid ${tab === t ? "var(--accent)" : "var(--border)"}`,
    color: tab === t ? "var(--accent)" : "var(--text-muted)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontWeight: tab === t ? 600 : 400,
    fontSize: "0.875rem",
    transition: "all 0.12s",
  });

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2rem clamp(16px, 3vw, 24px)" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-2xl)",
          fontWeight: 600,
          letterSpacing: "-0.015em",
          marginBottom: "var(--space-6)",
          color: "var(--text-primary)",
        }}
      >
        Friends
      </h1>

      {/* Add friend */}
      <form
        onSubmit={handleAddFriend}
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          padding: "1rem",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <input
          value={addUsername}
          onChange={(e) => setAddUsername(e.target.value)}
          placeholder="Username to add..."
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.9rem",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={adding}
          style={{
            padding: "0.5rem 1.25rem",
            background: "var(--accent)",
            border: "none",
            color: "var(--on-accent)",
            borderRadius: "var(--radius-sm)",
            cursor: adding ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "0.875rem",
            opacity: adding ? 0.7 : 1,
            fontFamily: "var(--font-body)",
          }}
        >
          Add Friend
        </button>
      </form>

      {addError && <p style={{ color: "var(--danger)", marginBottom: "1rem", fontSize: "0.85rem" }}>{addError}</p>}
      {addSuccess && <p style={{ color: "var(--success)", marginBottom: "1rem", fontSize: "0.85rem" }}>{addSuccess}</p>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button onClick={() => setTab("friends")} style={tabStyle("friends")}>
          My Friends ({friendProfiles.length})
        </button>
        <button onClick={() => setTab("pending")} style={tabStyle("pending")}>
          Pending ({pendingRequests.length})
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : tab === "friends" ? (
        friendProfiles.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No friends yet. Add some above!</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: "0.75rem" }}>
            {friendProfiles.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <Avatar username={u.username} avatarUrl={u.avatar_url} size={38} variant="solid" />
                <div style={{ flex: 1 }}>
                  <Link
                    to={`/profile/${u.id}`}
                    style={{
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      textDecoration: "none",
                      fontSize: "0.9rem",
                    }}
                  >
                    {u.username}
                  </Link>
                  <FriendVibe tags={friendTags.get(u.id)} myTags={myTags} bio={u.bio} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        pendingRequests.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No pending requests.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: "0.75rem" }}>
            {pendingRequests.map((req) => {
              const requester = requesterProfiles.get(req.requester_id);
              return (
                <div
                  key={req.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                  }}
                >
                  <Avatar
                    username={requester?.username ?? "?"}
                    avatarUrl={requester?.avatar_url ?? null}
                    size={38}
                    variant="solid"
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {requester?.username ?? req.requester_id}
                    </span>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                      wants to be your friend
                    </p>
                  </div>
                  <button
                    onClick={() => handleAccept(req)}
                    style={{
                      padding: "0.4rem 1rem",
                      background: "var(--accent)",
                      border: "none",
                      color: "var(--on-accent)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    Accept
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
