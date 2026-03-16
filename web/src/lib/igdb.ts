import type { IGDBGame } from "@gameboxd/lib";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const PROXY_URL = `${SUPABASE_URL}/functions/v1/igdb-proxy`;

const GAME_FIELDS =
  "fields id,name,summary,first_release_date,rating,rating_count," +
  "cover.id,cover.image_id,cover.url,genres.id,genres.name,platforms.id,platforms.name;";

async function callProxy(endpoint: string, body: string): Promise<IGDBGame[]> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ endpoint, body }),
  });
  if (!res.ok) throw new Error(`IGDB proxy error: ${res.statusText}`);
  return res.json() as Promise<IGDBGame[]>;
}

export async function searchGames(query: string): Promise<IGDBGame[]> {
  const body = `${GAME_FIELDS} search "${query.replace(/"/g, '\\"')}"; limit 20;`;
  return callProxy("/games", body);
}

export async function getGame(id: number): Promise<IGDBGame> {
  const body = `${GAME_FIELDS} where id = ${id}; limit 1;`;
  const results = await callProxy("/games", body);
  const game = results[0];
  if (!game) throw new Error(`Game ${id} not found`);
  return game;
}

export async function getGames(ids: number[]): Promise<IGDBGame[]> {
  if (ids.length === 0) return [];
  const body = `${GAME_FIELDS} where id = (${ids.join(",")}); limit ${ids.length};`;
  return callProxy("/games", body);
}
