import axios, { type AxiosInstance } from "axios";
import type { IGDBGame } from "../types/index.js";

// IGDB uses Twitch OAuth — the access token must be fetched server-side
// (client secret must never be exposed in the browser).
// In production, proxy IGDB calls through a Supabase Edge Function.

interface IGDBClientConfig {
  clientId: string;
  accessToken: string; // Bearer token obtained from Twitch OAuth
}

const IGDB_BASE = "https://api.igdb.com/v4";

// Fields requested on every game query
const GAME_FIELDS = `
  id,
  name,
  summary,
  first_release_date,
  rating,
  rating_count,
  cover.id,
  cover.image_id,
  cover.url,
  genres.id,
  genres.name,
  platforms.id,
  platforms.name
`.trim();

export function createIGDBClient(config: IGDBClientConfig): IGDBClient {
  const http = axios.create({
    baseURL: IGDB_BASE,
    headers: {
      "Client-ID": config.clientId,
      Authorization: `Bearer ${config.accessToken}`,
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
  });

  return new IGDBClient(http);
}

export class IGDBClient {
  constructor(private readonly http: AxiosInstance) {}

  async searchGames(query: string, limit = 20): Promise<IGDBGame[]> {
    const body = `
      fields ${GAME_FIELDS};
      search "${query.replace(/"/g, '\\"')}";
      limit ${limit};
    `;
    const { data } = await this.http.post<IGDBGame[]>("/games", body);
    return data;
  }

  async getGame(id: number): Promise<IGDBGame> {
    const body = `
      fields ${GAME_FIELDS};
      where id = ${id};
      limit 1;
    `;
    const { data } = await this.http.post<IGDBGame[]>("/games", body);
    const game = data[0];
    if (!game) throw new Error(`Game with id ${id} not found`);
    return game;
  }

  async getGames(ids: number[]): Promise<IGDBGame[]> {
    if (ids.length === 0) return [];
    const body = `
      fields ${GAME_FIELDS};
      where id = (${ids.join(",")});
      limit ${ids.length};
    `;
    const { data } = await this.http.post<IGDBGame[]>("/games", body);
    return data;
  }

  async getTopRated(limit = 20): Promise<IGDBGame[]> {
    const body = `
      fields ${GAME_FIELDS};
      where rating_count > 100;
      sort rating desc;
      limit ${limit};
    `;
    const { data } = await this.http.post<IGDBGame[]>("/games", body);
    return data;
  }
}

// ── Cover art URL helpers ───────────────────────────────────────────────────

export type CoverSize =
  | "cover_small"   // 90 × 128
  | "cover_big"     // 264 × 374
  | "screenshot_med"
  | "screenshot_big"
  | "screenshot_huge"
  | "thumb"
  | "micro"
  | "720p"
  | "1080p";

export function getCoverUrl(imageId: string, size: CoverSize = "cover_big"): string {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}
