import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./client.js";
import type { GameLogRow, GameStatus, TopGameRow, ActivityType } from "../types/index.js";

export async function upsertGameLog(
  client: SupabaseClient<Database>,
  userId: string,
  gameIgdbId: number,
  status: GameStatus,
  rating?: number | null,
  review?: string | null
): Promise<GameLogRow> {
  // Check for existing log to decide insert vs update
  const { data: existing } = await client
    .from("game_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("game_igdb_id", gameIgdbId)
    .maybeSingle();

  let row: GameLogRow;

  if (existing) {
    const { data, error } = await client
      .from("game_logs")
      .update({ status, rating: rating ?? null, review: review ?? null, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    row = data;
  } else {
    const { data, error } = await client
      .from("game_logs")
      .insert({ user_id: userId, game_igdb_id: gameIgdbId, status, rating: rating ?? null, review: review ?? null })
      .select()
      .single();
    if (error) throw error;
    row = data;
  }

  // Record activity
  const activityType: ActivityType = review ? "reviewed" : rating != null ? "rated" : "logged";
  await client.from("activity").insert({
    user_id: userId,
    type: activityType,
    game_igdb_id: gameIgdbId,
    metadata: { status, rating: rating ?? null },
  });

  return row;
}

export async function getUserGameLogs(
  client: SupabaseClient<Database>,
  userId: string
): Promise<GameLogRow[]> {
  const { data, error } = await client
    .from("game_logs")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getTopGames(
  client: SupabaseClient<Database>,
  userId: string
): Promise<TopGameRow[]> {
  const { data, error } = await client
    .from("top_games")
    .select("*")
    .eq("user_id", userId)
    .order("position");
  if (error) throw error;
  return data;
}

export async function setTopGame(
  client: SupabaseClient<Database>,
  userId: string,
  position: 1 | 2 | 3,
  gameIgdbId: number
): Promise<void> {
  const { error } = await client
    .from("top_games")
    .upsert({ user_id: userId, position, game_igdb_id: gameIgdbId });
  if (error) throw error;

  await client.from("activity").insert({
    user_id: userId,
    type: "topped",
    game_igdb_id: gameIgdbId,
    metadata: { position },
  });
}

export async function deleteGameLog(
  client: SupabaseClient<Database>,
  userId: string,
  gameIgdbId: number
): Promise<void> {
  const { error } = await client
    .from("game_logs")
    .delete()
    .eq("user_id", userId)
    .eq("game_igdb_id", gameIgdbId);
  if (error) throw error;
}

export async function toggleLike(
  client: SupabaseClient<Database>,
  userId: string,
  gameIgdbId: number,
  isLiked: boolean
): Promise<void> {
  const { error } = await client
    .from("game_logs")
    .update({ is_liked: isLiked })
    .eq("user_id", userId)
    .eq("game_igdb_id", gameIgdbId);
  if (error) throw error;
}

export async function removeTopGame(
  client: SupabaseClient<Database>,
  userId: string,
  position: 1 | 2 | 3
): Promise<void> {
  const { error } = await client
    .from("top_games")
    .delete()
    .eq("user_id", userId)
    .eq("position", position);
  if (error) throw error;
}
