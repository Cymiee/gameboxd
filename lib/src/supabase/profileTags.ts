import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./client.js";
import type { UserProfileTagsRow } from "../types/index.js";

export type ProfileTagsUpdate = Partial<
  Pick<UserProfileTagsRow, "avatar_id" | "genres" | "archetypes" | "onboarding_completed">
>;

export async function getProfileTags(
  client: SupabaseClient<Database>,
  userId: string
): Promise<UserProfileTagsRow | null> {
  const { data, error } = await client
    .from("user_profile_tags")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Partial update — only the fields passed are written; the rest are left untouched. */
export async function upsertProfileTags(
  client: SupabaseClient<Database>,
  userId: string,
  updates: ProfileTagsUpdate
): Promise<UserProfileTagsRow> {
  const { data, error } = await client
    .from("user_profile_tags")
    .upsert({ user_id: userId, ...updates }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}
