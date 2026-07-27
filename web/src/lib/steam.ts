import { supabase } from "./supabase";

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steam-auth`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Start Steam OpenID linking: asks the edge function for a signed Steam login
 * URL (authenticated as the current user), then redirects the browser to it.
 * Steam redirects back to Settings with ?steam=linked|error.
 */
export async function startSteamLink(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You need to be signed in.");

  const res = await fetch(`${FN}?action=login`, {
    headers: { Authorization: `Bearer ${token}`, apikey: ANON },
  });
  if (!res.ok) throw new Error("Couldn't start Steam linking. Try again.");

  const { url } = (await res.json()) as { url: string };
  window.location.href = url;
}
