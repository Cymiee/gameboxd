const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// How long proxied IGDB responses stay fresh. Game metadata changes slowly and
// the lists are "trending"/"new releases" style queries, so minutes are fine.
const RESPONSE_TTL_SECONDS = 600;

// Refresh the Twitch token this long before it actually expires.
const TOKEN_SKEW_SECONDS = 300;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const restHeaders = {
  "Content-Type": "application/json",
  apikey: SERVICE_ROLE_KEY ?? "",
  Authorization: `Bearer ${SERVICE_ROLE_KEY ?? ""}`,
};

interface CacheRow {
  value: unknown;
  expires_at: string;
}

/**
 * Read a live cache entry. Returns null on miss, expiry, or any cache failure —
 * the cache is strictly an optimisation and must never break a request.
 */
async function cacheGet<T>(key: string): Promise<T | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/igdb_cache?key=eq.${encodeURIComponent(key)}&select=value,expires_at&limit=1`,
      { headers: restHeaders },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as CacheRow[];
    const row = rows[0];
    if (!row) return null;
    if (new Date(row.expires_at).getTime() <= Date.now()) return null;
    return row.value as T;
  } catch {
    return null;
  }
}

declare const EdgeRuntime: { waitUntil?: (p: Promise<unknown>) => void } | undefined;

/**
 * Upsert a cache entry without blocking the response. Writing the cache is not
 * something the caller should wait on — awaiting it added ~1s to every miss.
 * waitUntil keeps the isolate alive until the write lands.
 */
function cacheSet(key: string, value: unknown, ttlSeconds: number): void {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;
  const write = fetch(`${SUPABASE_URL}/rest/v1/igdb_cache?on_conflict=key`, {
    method: "POST",
    headers: { ...restHeaders, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      key,
      value,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    }),
  }).catch(() => {});

  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(write);
  }
}

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getAccessToken(): Promise<string> {
  const cached = await cacheGet<string>("twitch_token");
  if (cached) return cached;

  const clientId = Deno.env.get("IGDB_CLIENT_ID");
  const clientSecret = Deno.env.get("IGDB_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Missing IGDB_CLIENT_ID or IGDB_CLIENT_SECRET env vars");
  }

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error(`Twitch token fetch failed: ${res.statusText}`);

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cacheSet("twitch_token", json.access_token, Math.max(json.expires_in - TOKEN_SKEW_SECONDS, 60));
  return json.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { endpoint, body } = (await req.json()) as { endpoint: string; body: string };

    const cacheKey = `q:${await sha256(`${endpoint}\n${body}`)}`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached !== null) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const clientId = Deno.env.get("IGDB_CLIENT_ID")!;
    const accessToken = await getAccessToken();

    const igdbRes = await fetch(`https://api.igdb.com/v4${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
        Accept: "application/json",
      },
      body,
    });

    if (!igdbRes.ok) {
      throw new Error(`IGDB request failed: ${igdbRes.statusText}`);
    }

    const data = await igdbRes.json();
    cacheSet(cacheKey, data, RESPONSE_TTL_SECONDS);

    // Drop expired rows occasionally rather than running a scheduled job.
    if (Math.random() < 0.02 && SUPABASE_URL && SERVICE_ROLE_KEY) {
      fetch(`${SUPABASE_URL}/rest/v1/rpc/prune_igdb_cache`, {
        method: "POST",
        headers: restHeaders,
        body: "{}",
      }).catch(() => {});
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
