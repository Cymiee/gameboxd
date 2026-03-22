import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./client.js";
import type { UserRow } from "../types/index.js";

export async function signUp(
  client: SupabaseClient<Database>,
  email: string,
  password: string,
  username: string
): Promise<{ userId: string; needsConfirmation: boolean }> {
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Signup succeeded but no user returned");

  // Only insert the users row if we have a live session (email confirmation disabled).
  // When confirmation is required, session is null — we create the row on first sign-in instead.
  if (data.session) {
    const { error: profileError } = await client.from("users").insert({
      id: data.user.id,
      username,
      bio: null,
      avatar_url: null,
    });
    if (profileError) throw profileError;
  }

  return { userId: data.user.id, needsConfirmation: !data.session };
}

export async function signIn(
  client: SupabaseClient<Database>,
  email: string,
  password: string
): Promise<{ userId: string }> {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Sign-in succeeded but no user returned");

  // Ensure the users row exists — it may be missing if the user signed up with
  // email confirmation enabled and this is their first sign-in after confirming.
  const { data: existingUser } = await client
    .from("users")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!existingUser) {
    const username = (data.user.user_metadata?.username as string | undefined) ?? email.split("@")[0] ?? "user";
    await client.from("users").insert({
      id: data.user.id,
      username,
      bio: null,
      avatar_url: null,
    });
  }

  return { userId: data.user.id };
}

export async function signOut(
  client: SupabaseClient<Database>
): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function ensureProfile(
  client: SupabaseClient<Database>,
  userId: string,
  fallbackUsername: string
): Promise<UserRow> {
  const { data: existing } = await client
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await client
    .from("users")
    .insert({ id: userId, username: fallbackUsername, bio: null, avatar_url: null })
    .select()
    .single();

  if (error) throw error;
  return data;
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
