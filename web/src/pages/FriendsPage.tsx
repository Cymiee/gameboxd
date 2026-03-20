import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { UserRow, FriendshipRow } from "@gameboxd/lib";
import { getFriends, getPendingRequests, sendFriendRequest, acceptFriendRequest } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";

type Tab = "friends" | "pending";

export default function FriendsPage() {
  const { userId } = useAuthStore();
  const [tab, setTab] = useState<Tab>("friends");

  const [friendProfiles, setFriendProfiles] = useState<UserRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendshipRow[]>([]);
  const [requesterProfiles, setRequesterProfiles] = useState<Map<string, UserRow>>(new Map());
  const [loading, setLoading] = useState(true);

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

      if (friendIds.length > 0) {
        const { data } = await supabase.from("users").select("*").in("id", friendIds);
        setFriendProfiles((data ?? []) as UserRow[]);
      } else {
        setFriendProfiles([]);
      }

      setPendingRequests(pending);

      if (pending.length > 0) {
        const requesterIds = pending.map((p) => p.requester_id);
        const { data } = await supabase.from("users").select("*").in("id", requesterIds);
        const m = new Map<string, UserRow>();
        for (const u of (data ?? []) as UserRow[]) m.set(u.id, u);
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
      const { data } = await supabase
        .from("users")
        .select("id, username")
        .eq("username", addUsername.trim())
        .maybeSingle();

      if (!data) {
        setAddError(`No user found with username "${addUsername.trim()}"`);
        return;
      }
      if (data.id === userId) {
        setAddError("You can't add yourself.");
        return;
      }

      await sendFriendRequest(supabase, userId, data.id);
      setAddSuccess(`Friend request sent to ${data.username}!`);
      setAddUsername("");
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to send request");
    } finally {
      setAdding(false);
    }
  };

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: "0.5rem 1.25rem",
    background: tab === t ? "rgba(228,255,26,0.1)" : "none",
    border: `1px solid ${tab === t ? "var(--accent)" : "var(--border)"}`,
    color: tab === t ? "var(--accent)" : "var(--muted)",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: tab === t ? 600 : 400,
    fontSize: "0.875rem",
    transition: "all 0.12s",
  });

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2rem 24px" }}>
      <h1
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "1.5rem",
          color: "var(--text)",
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
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}
      >
        <input
          value={addUsername}
          onChange={(e) => setAddUsername(e.target.value)}
          placeholder="Username to add..."
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            borderRadius: 8,
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
            color: "#0e0e10",
            borderRadius: 8,
            cursor: adding ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: "0.875rem",
            opacity: adding ? 0.7 : 1,
            fontFamily: "Syne, sans-serif",
          }}
        >
          Add Friend
        </button>
      </form>

      {addError && <p style={{ color: "var(--danger)", marginBottom: "1rem", fontSize: "0.85rem" }}>{addError}</p>}
      {addSuccess && <p style={{ color: "#4ade80", marginBottom: "1rem", fontSize: "0.85rem" }}>{addSuccess}</p>}

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
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      ) : tab === "friends" ? (
        friendProfiles.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No friends yet. Add some above!</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.75rem" }}>
            {friendProfiles.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    color: "#0e0e10",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    flexShrink: 0,
                    fontFamily: "Syne, sans-serif",
                  }}
                >
                  {u.username[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <Link
                    to={`/profile/${u.id}`}
                    style={{
                      fontWeight: 600,
                      color: "var(--text)",
                      textDecoration: "none",
                      fontSize: "0.9rem",
                    }}
                  >
                    {u.username}
                  </Link>
                  {u.bio && (
                    <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.bio}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        pendingRequests.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No pending requests.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.75rem" }}>
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
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "var(--border)",
                      color: "var(--muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      flexShrink: 0,
                    }}
                  >
                    {requester?.username[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {requester?.username ?? req.requester_id}
                    </span>
                    <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>
                      wants to be your friend
                    </p>
                  </div>
                  <button
                    onClick={() => handleAccept(req)}
                    style={{
                      padding: "0.4rem 1rem",
                      background: "var(--accent)",
                      border: "none",
                      color: "#0e0e10",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 700,
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
