// Steam library sync — fetches the caller's owned games + playtime from Steam,
// matches Steam appids to IGDB games, and replaces their steam_library rows.
// Requires the user to have linked Steam (users.steam_id) and set their Steam
// "Game details" privacy to Public. verify_jwt is ON (called by the client).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STEAM_API_KEY = Deno.env.get("STEAM_API_KEY") ?? "";

const restHeaders = {
  "Content-Type": "application/json",
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
};

interface SteamGame {
  appid: number;
  name: string;
  playtime_forever?: number;
  playtime_2weeks?: number;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Map Steam appids → IGDB game ids via the igdb-proxy (external_game_source = 1). */
async function matchAppids(appids: number[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const group of chunk(appids, 500)) {
    const uids = group.map((a) => `"${a}"`).join(",");
    const body = `fields game,uid; where external_game_source = 1 & uid = (${uids}); limit 500;`;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/igdb-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ endpoint: "/external_games", body }),
    });
    if (!res.ok) continue; // matching is best-effort; unmatched games still store
    const rows = (await res.json()) as { game: number; uid: string }[];
    for (const r of rows) if (!map.has(r.uid)) map.set(r.uid, r.game);
  }
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!STEAM_API_KEY) return json({ error: "Steam sync isn't configured on the server yet." }, 500);

    // Who's calling?
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Not signed in" }, 401);
    const ures = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_ROLE_KEY },
    });
    if (!ures.ok) return json({ error: "Invalid session" }, 401);
    const userId = ((await ures.json()) as { id: string }).id;

    // Their linked SteamID
    const uRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=steam_id`, { headers: restHeaders });
    const steamId = ((await uRes.json()) as { steam_id: string | null }[])[0]?.steam_id;
    if (!steamId) return json({ error: "No Steam account linked." }, 400);

    // Owned games + playtime
    const ownedRes = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}` +
        `&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`,
    );
    if (!ownedRes.ok) return json({ error: "Couldn't reach Steam. Try again shortly." }, 502);
    const owned = (await ownedRes.json()) as { response?: { games?: SteamGame[] } };
    const games = owned.response?.games;
    if (!games) {
      return json({ error: "Couldn't read your library — set your Steam profile's Game details to Public." }, 400);
    }

    // Match appids → IGDB
    const igdbMap = await matchAppids(games.map((g) => g.appid));

    const rows = games.map((g) => ({
      user_id: userId,
      appid: g.appid,
      name: g.name,
      playtime_min: g.playtime_forever ?? 0,
      playtime_2wk: g.playtime_2weeks ?? 0,
      game_igdb_id: igdbMap.get(String(g.appid)) ?? null,
    }));

    // Replace the library wholesale (drops games no longer owned).
    await fetch(`${SUPABASE_URL}/rest/v1/steam_library?user_id=eq.${userId}`, { method: "DELETE", headers: restHeaders });
    for (const group of chunk(rows, 500)) {
      const ins = await fetch(`${SUPABASE_URL}/rest/v1/steam_library`, {
        method: "POST",
        headers: { ...restHeaders, Prefer: "return=minimal" },
        body: JSON.stringify(group),
      });
      if (!ins.ok) return json({ error: "Couldn't save your library.", detail: await ins.text() }, 500);
    }

    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: "PATCH",
      headers: { ...restHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({ steam_synced_at: new Date().toISOString() }),
    });

    const matched = rows.filter((r) => r.game_igdb_id != null).length;
    return json({
      owned: rows.length,
      matched,
      unmatched: rows.filter((r) => r.game_igdb_id == null).map((r) => r.name).slice(0, 50),
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
