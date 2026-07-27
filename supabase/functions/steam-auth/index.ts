// Steam "Sign in through Steam" (OpenID 2.0) — links a SteamID to the signed-in
// Shelved account. Two actions:
//   ?action=login    (called via fetch with the user's Supabase JWT) → returns
//                     { url } to redirect the browser to Steam.
//   ?action=callback (Steam redirects the browser here) → verifies the OpenID
//                     response with Steam, then writes users.steam_id.
//
// verify_jwt is OFF for this function because the callback arrives from Steam
// with no JWT. /login therefore verifies the caller's JWT manually, and the
// callback trusts a short-lived HMAC-signed `state` carrying the user id.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/steam-auth`;
const STATE_TTL_MS = 5 * 60 * 1000;

const enc = (s: string) => new TextEncoder().encode(s);

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc(SERVICE_ROLE_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeState(userId: string): Promise<string> {
  const exp = String(Date.now() + STATE_TTL_MS);
  const sig = await hmac(`${userId}.${exp}`);
  return `${userId}.${exp}.${sig}`;
}

async function readState(state: string | null): Promise<string | null> {
  if (!state) return null;
  const [userId, exp, sig] = state.split(".");
  if (!userId || !exp || !sig) return null;
  if (Date.now() > Number(exp)) return null;
  const expected = await hmac(`${userId}.${exp}`);
  // Constant-ish comparison
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? userId : null;
}

function appRedirect(status: "linked" | "error", reason?: string): Response {
  const base = APP_BASE_URL || "/";
  const q = reason ? `?steam=${status}&reason=${encodeURIComponent(reason)}` : `?steam=${status}`;
  return new Response(null, { status: 302, headers: { Location: `${base}/settings${q}` } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // ── /login — build the Steam redirect for the authenticated caller ──────────
  if (action === "login") {
    try {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (!token) return json({ error: "Not signed in" }, 401);

      const ures = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_ROLE_KEY },
      });
      if (!ures.ok) return json({ error: "Invalid session" }, 401);
      const user = (await ures.json()) as { id: string };

      const state = await makeState(user.id);
      const returnTo = `${FUNCTION_URL}?action=callback&state=${encodeURIComponent(state)}`;
      const params = new URLSearchParams({
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode": "checkid_setup",
        "openid.return_to": returnTo,
        "openid.realm": SUPABASE_URL,
        "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
      });
      return json({ url: `https://steamcommunity.com/openid/login?${params.toString()}` });
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  }

  // ── /callback — Steam redirected the browser back here ──────────────────────
  if (action === "callback") {
    try {
      const userId = await readState(url.searchParams.get("state"));
      if (!userId) return appRedirect("error", "expired");

      // Verify the OpenID assertion directly with Steam (never trust raw params).
      const body = new URLSearchParams();
      for (const [k, v] of url.searchParams) if (k.startsWith("openid.")) body.set(k, v);
      body.set("openid.mode", "check_authentication");
      const vres = await fetch("https://steamcommunity.com/openid/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const vtext = await vres.text();
      if (!/is_valid\s*:\s*true/.test(vtext)) return appRedirect("error", "unverified");

      const claimed = url.searchParams.get("openid.claimed_id") ?? "";
      const steamId = claimed.match(/\/openid\/id\/(\d+)/)?.[1];
      if (!steamId) return appRedirect("error", "no_steamid");

      const patch = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ steam_id: steamId, steam_synced_at: new Date().toISOString() }),
      });
      if (!patch.ok) {
        // 23505 = unique violation → this SteamID is linked to another account.
        const reason = (await patch.text()).includes("23505") ? "already_linked" : "save_failed";
        return appRedirect("error", reason);
      }

      return appRedirect("linked");
    } catch {
      return appRedirect("error", "server");
    }
  }

  return json({ error: "Unknown action" }, 400);
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
