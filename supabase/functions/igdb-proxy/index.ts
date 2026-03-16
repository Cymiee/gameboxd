const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const clientId = Deno.env.get("IGDB_CLIENT_ID");
  const clientSecret = Deno.env.get("IGDB_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Missing IGDB_CLIENT_ID or IGDB_CLIENT_SECRET env vars");
  }

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(`Twitch token fetch failed: ${res.statusText}`);

  const json = await res.json() as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  };
  return tokenCache.token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { endpoint, body } = await req.json() as { endpoint: string; body: string };

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
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
