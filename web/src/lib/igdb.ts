import type { IGDBGame } from "@gameboxd/lib";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const PROXY_URL = `${SUPABASE_URL}/functions/v1/igdb-proxy`;

const GAME_FIELDS =
  "fields id,name,summary,first_release_date,rating,rating_count,hypes,similar_games," +
  "cover.id,cover.image_id,cover.url,genres.id,genres.name,platforms.id,platforms.name," +
  "involved_companies.company.id,involved_companies.company.name,involved_companies.developer;";

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
  const escaped = query.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const body = `${GAME_FIELDS} where name ~ *"${escaped}"* & rating_count != null; sort rating_count desc; limit 20;`;
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

export async function getTrendingGames(): Promise<IGDBGame[]> {
  const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 3600;
  const body = `${GAME_FIELDS} where rating_count > 50 & first_release_date > ${oneYearAgo}; sort rating_count desc; limit 24;`;
  return callProxy("/games", body);
}

export async function getGamesByGenre(genreId: number, excludeIds: number[]): Promise<IGDBGame[]> {
  const exclude = excludeIds.length > 0 ? ` & id != (${excludeIds.join(",")})` : "";
  const body = `${GAME_FIELDS} where genres = ${genreId}${exclude} & rating_count > 30; sort rating_count desc; limit 15;`;
  return callProxy("/games", body);
}

export async function getNewReleases(limit = 7): Promise<IGDBGame[]> {
  const now = Math.floor(Date.now() / 1000);
  const fourteenDaysAgo = now - 14 * 24 * 3600;
  const body = `${GAME_FIELDS} where first_release_date >= ${fourteenDaysAgo} & first_release_date <= ${now} & hypes > 0; sort hypes desc; limit ${limit};`;
  return callProxy("/games", body);
}

export async function getGamesByFilter(
  genreIds: number[],
  themeIds: number[],
  query?: string
): Promise<IGDBGame[]> {
  const conditions: string[] = ["rating_count > 5"];
  if (query) {
    const escaped = query.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    conditions.push(`name ~ *"${escaped}"*`);
  }
  if (genreIds.length > 0) conditions.push(`genres = (${genreIds.join(",")}) `);
  if (themeIds.length > 0) conditions.push(`themes = (${themeIds.join(",")}) `);
  const body = `${GAME_FIELDS} where ${conditions.join("& ")}; sort rating_count desc; limit 30;`;
  return callProxy("/games", body);
}
