import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./client.js";
import type { SteamLibraryRow } from "../types/index.js";

/** A user's full Steam library, most-played first. */
export async function getSteamLibrary(
  client: SupabaseClient<Database>,
  userId: string
): Promise<SteamLibraryRow[]> {
  const { data, error } = await client
    .from("steam_library")
    .select("*")
    .eq("user_id", userId)
    .order("playtime_min", { ascending: false });
  if (error) throw error;
  return data;
}

export interface SteamStats {
  gameCount: number;
  totalMinutes: number;
  matchedCount: number;
}

/**
 * Import the caller's played Steam games into their logs (status "played") and
 * merge hours onto existing logs. Idempotent; never overwrites a manual log's
 * status/rating/review. Runs as one atomic RPC.
 */
export async function importSteamLogs(
  client: SupabaseClient<Database>
): Promise<{ imported: number; updated: number }> {
  const { data, error } = await client.rpc("import_steam_logs");
  if (error) throw error;
  return data as { imported: number; updated: number };
}

/** Aggregate stats for a profile's Steam library. */
export async function getSteamStats(
  client: SupabaseClient<Database>,
  userId: string
): Promise<SteamStats> {
  const { data, error } = await client
    .from("steam_library")
    .select("playtime_min, game_igdb_id")
    .eq("user_id", userId);
  if (error) throw error;
  const rows = data ?? [];
  return {
    gameCount: rows.length,
    totalMinutes: rows.reduce((sum, r) => sum + (r.playtime_min ?? 0), 0),
    matchedCount: rows.filter((r) => r.game_igdb_id != null).length,
  };
}
