import type { IGDBGame } from '@gameboxd/lib';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

const PROXY_URL = `${SUPABASE_URL}/functions/v1/igdb-proxy`;

const GAME_FIELDS =
  'fields id,name,summary,first_release_date,rating,rating_count,total_rating,total_rating_count,hypes,similar_games,' +
  'cover.id,cover.image_id,cover.url,genres.id,genres.name,platforms.id,platforms.name,' +
  'involved_companies.company.id,involved_companies.company.name,involved_companies.developer,' +
  'artworks.id,artworks.image_id,artworks.width,artworks.height,' +
  'screenshots.id,screenshots.image_id,screenshots.width,screenshots.height;';

export function getArtworkUrl(image_id: string): string {
  return `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${image_id}.jpg`;
}

async function callProxy(endpoint: string, body: string): Promise<IGDBGame[]> {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ endpoint, body }),
  });
  if (!res.ok) throw new Error(`IGDB proxy error: ${res.statusText}`);
  return res.json() as Promise<IGDBGame[]>;
}

export async function searchGames(query: string, limit = 20): Promise<IGDBGame[]> {
  const escaped = query.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const body = `search "${escaped}"; ${GAME_FIELDS} limit ${limit};`;
  return callProxy('/games', body);
}

export async function getGame(id: number): Promise<IGDBGame> {
  const body = `${GAME_FIELDS} where id = ${id}; limit 1;`;
  const results = await callProxy('/games', body);
  const game = results[0];
  if (!game) throw new Error(`Game ${id} not found`);
  return game;
}

export async function getGames(ids: number[]): Promise<IGDBGame[]> {
  if (ids.length === 0) return [];
  const body = `${GAME_FIELDS} where id = (${ids.join(',')}); limit ${ids.length};`;
  return callProxy('/games', body);
}

export async function getTrendingGames(limit = 10): Promise<IGDBGame[]> {
  const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 3600;
  const body = `${GAME_FIELDS} where rating_count > 50 & first_release_date > ${oneYearAgo}; sort hypes desc; limit ${limit};`;
  return callProxy('/games', body);
}

export async function getNewReleases(limit = 10): Promise<IGDBGame[]> {
  const now = Math.floor(Date.now() / 1000);
  const fourteenDaysAgo = now - 14 * 24 * 3600;
  const body = `${GAME_FIELDS} where first_release_date >= ${fourteenDaysAgo} & first_release_date <= ${now} & hypes > 0; sort hypes desc; limit ${limit};`;
  return callProxy('/games', body);
}

export async function getTopRated(limit = 10): Promise<IGDBGame[]> {
  const body = `${GAME_FIELDS} where total_rating_count > 100; sort total_rating desc; limit ${limit};`;
  return callProxy('/games', body);
}

export async function getGamesByGenre(genreId: number, excludeIds: number[] = [], limit = 15): Promise<IGDBGame[]> {
  const exclude = excludeIds.length > 0 ? ` & id != (${excludeIds.join(',')})` : '';
  const body = `${GAME_FIELDS} where genres = ${genreId}${exclude} & rating_count > 30; sort rating_count desc; limit ${limit};`;
  return callProxy('/games', body);
}
