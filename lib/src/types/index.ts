// ── Database row types ──────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface TopGameRow {
  user_id: string;
  game_igdb_id: number;
  position: 1 | 2 | 3;
}

export type GameStatus = "playing" | "completed" | "dropped" | "want_to_play";

export interface GameLogRow {
  id: string;
  user_id: string;
  game_igdb_id: number;
  status: GameStatus;
  rating: number | null; // 1–10
  review: string | null;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}

export type FriendshipStatus = "pending" | "accepted";

export interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
}

export type ActivityType = "logged" | "rated" | "reviewed" | "topped";

export interface ActivityRow {
  id: string;
  user_id: string;
  type: ActivityType;
  game_igdb_id: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ListRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  likes: number;
  created_at: string;
  updated_at: string;
}

export interface ListGameRow {
  id: string;
  list_id: string;
  game_igdb_id: number;
  position: number;
  created_at: string;
}

// ── IGDB types ──────────────────────────────────────────────────────────────

export interface IGDBInvolvedCompany {
  id: number;
  company: { id: number; name: string };
  developer: boolean;
}

export interface IGDBGame {
  id: number;
  name: string;
  summary: string | null;
  cover: IGDBCover | null;
  genres: IGDBGenre[] | null;
  platforms: IGDBPlatform[] | null;
  involved_companies: IGDBInvolvedCompany[] | null;
  first_release_date: number | null; // Unix timestamp
  rating: number | null;
  rating_count: number | null;
  similar_games?: number[];
  hypes?: number;
  total_rating?: number;
  total_rating_count?: number;
  artworks?: { id: number; image_id: string; width?: number; height?: number }[];
  screenshots?: { id: number; image_id: string; width?: number; height?: number }[];
}

export interface IGDBCover {
  id: number;
  image_id: string;
  url: string;
}

export interface IGDBGenre {
  id: number;
  name: string;
}

export interface IGDBPlatform {
  id: number;
  name: string;
}

// ── Auth types ──────────────────────────────────────────────────────────────

export interface AuthState {
  userId: string | null;
  loading: boolean;
}

// ── Activity feed ───────────────────────────────────────────────────────────

export interface ActivityFeedItem extends ActivityRow {
  user: Pick<UserRow, "id" | "username" | "avatar_url">;
  game: Pick<IGDBGame, "id" | "name" | "cover">;
}
