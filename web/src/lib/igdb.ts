import type { IGDBGame } from "@gameboxd/lib";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const PROXY_URL = `${SUPABASE_URL}/functions/v1/igdb-proxy`;

export type SortMode = "trending" | "top_rated" | "new_releases" | "az";

const GAME_FIELDS =
  "fields id,name,summary,first_release_date,rating,rating_count,total_rating,total_rating_count,hypes,similar_games," +
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

export async function getBrowseGames({
  genreId,
  themeId,
  query,
  sort = "trending",
  limit = 40,
}: {
  genreId?: number;
  themeId?: number;
  query?: string;
  sort?: SortMode;
  limit?: number;
}): Promise<IGDBGame[]> {
  const conditions: string[] = [];
  if (query) {
    const escaped = query.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    conditions.push(`name ~ *"${escaped}"*`);
  }
  if (genreId !== undefined) conditions.push(`genres = ${genreId}`);
  if (themeId !== undefined) conditions.push(`themes = ${themeId}`);

  if (sort === "top_rated") {
    // Fetch a larger pool, then sort client-side by Bayesian average so that
    // games with few reviews can't outrank well-reviewed titles.
    const poolConditions = [
      ...conditions,
      "total_rating != null",
      "total_rating_count > 50",
    ];
    const whereClause = `where ${poolConditions.join(" & ")}; `;
    const body = `${GAME_FIELDS} ${whereClause}sort total_rating desc; limit 200;`;
    const pool = await callProxy("/games", body);

    // Bayesian average: score = (v*R + m*C) / (v + m)
    // C = prior mean rating (~72 on IGDB's 0-100 scale)
    // m = confidence threshold (200 votes to reach full weight)
    const C = 72;
    const m = 200;
    const bayesian = (game: IGDBGame) => {
      const v = game.total_rating_count ?? 0;
      const R = game.total_rating ?? 0;
      return (v * R + m * C) / (v + m);
    };

    return pool.sort((a, b) => bayesian(b) - bayesian(a)).slice(0, limit);
  }

  let sortClause: string;
  switch (sort) {
    case "new_releases":
      sortClause = "sort first_release_date desc";
      break;
    case "az":
      sortClause = "sort name asc";
      break;
    default:
      conditions.push("rating_count > 10");
      sortClause = "sort hypes desc";
  }

  const whereClause = conditions.length > 0 ? `where ${conditions.join(" & ")}; ` : "";
  const body = `${GAME_FIELDS} ${whereClause}${sortClause}; limit ${limit};`;
  return callProxy("/games", body);
}
