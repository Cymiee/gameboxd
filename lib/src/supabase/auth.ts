import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./client.js";
import type { UserRow } from "../types/index.js";

export async function signUp(
  client: SupabaseClient<Database>,
  email: string,
  password: string,
  username: string
): Promise<{ userId: string }> {
  console.log("[signUp] calling auth.signUp...");
  const { data, error } = await client.auth.signUp({ email, password });
  console.log("[signUp] auth.signUp result:", { user: data.user?.id, session: !!data.session, error });
  if (error) throw error;
  if (!data.user) throw new Error("Signup succeeded but no user returned");

  console.log("[signUp] inserting into users table...");
  const { error: profileError } = await client.from("users").insert({
    id: data.user.id,
    username,
    bio: null,
    avatar_url: null,
  });
  console.log("[signUp] users insert result:", { profileError });
  if (profileError) throw profileError;

  return { userId: data.user.id };
}

export async function signIn(
  client: SupabaseClient<Database>,
  email: string,
  password: string
): Promise<{ userId: string }> {
  console.log("[signIn] calling signInWithPassword...");
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  console.log("[signIn] result:", { userId: data?.user?.id, error });
  if (error) throw error;
  if (!data.user) throw new Error("Sign-in succeeded but no user returned");
  return { userId: data.user.id };
}

export async function signOut(
  client: SupabaseClient<Database>
): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getProfile(
  client: SupabaseClient<Database>,
  userId: string
): Promise<UserRow> {
  const { data, error } = await client
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  client: SupabaseClient<Database>,
  userId: string,
  updates: Partial<Pick<UserRow, "username" | "bio" | "avatar_url">>
): Promise<UserRow> {
  const { data, error } = await client
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
