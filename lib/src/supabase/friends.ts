import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./client.js";
import type { FriendshipRow, ActivityRow } from "../types/index.js";

export async function sendFriendRequest(
  client: SupabaseClient<Database>,
  requesterId: string,
  addresseeId: string
): Promise<FriendshipRow> {
  const { data, error } = await client
    .from("friendships")
    .insert({ requester_id: requesterId, addressee_id: addresseeId, status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function acceptFriendRequest(
  client: SupabaseClient<Database>,
  friendshipId: string,
  addresseeId: string
): Promise<FriendshipRow> {
  const { data, error } = await client
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId)
    .eq("addressee_id", addresseeId) // ensure only addressee can accept
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getFriends(
  client: SupabaseClient<Database>,
  userId: string
): Promise<string[]> {
  const { data, error } = await client
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;

  return data.map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );
}

export async function getPendingRequests(
  client: SupabaseClient<Database>,
  userId: string
): Promise<FriendshipRow[]> {
  const { data, error } = await client
    .from("friendships")
    .select("*")
    .eq("addressee_id", userId)
    .eq("status", "pending");
  if (error) throw error;
  return data;
}

export async function getPopularAmongFriends(
  client: SupabaseClient<Database>,
  userId: string,
  limit = 8
): Promise<{ gameIgdbId: number; count: number }[]> {
  const friendIds = await getFriends(client, userId);
  if (friendIds.length === 0) return [];

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const { data, error } = await client
    .from("game_logs")
    .select("game_igdb_id")
    .in("user_id", friendIds)
    .gte("updated_at", thirtyDaysAgo);

  if (error) throw error;

  const freq = new Map<number, number>();
  for (const row of data) {
    freq.set(row.game_igdb_id, (freq.get(row.game_igdb_id) ?? 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([gameIgdbId, count]) => ({ gameIgdbId, count }));
}

export async function getFriendsActivityFeed(
  client: SupabaseClient<Database>,
  userId: string,
  limit = 50
): Promise<ActivityRow[]> {
  const friendIds = await getFriends(client, userId);
  if (friendIds.length === 0) return [];

  const { data, error } = await client
    .from("activity")
    .select("*")
    .in("user_id", friendIds)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
