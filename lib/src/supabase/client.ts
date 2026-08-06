import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GameStatus, FriendshipStatus, ActivityType } from "../types/index.js";

// ── Database type map for Supabase client generics ──────────────────────────
// All Insert/Update types use explicit inline shapes (no Omit/Partial mapped
// types) because TypeScript fails the GenericTable extends check with complex
// mapped types when strict flags like noUncheckedIndexedAccess are in play.

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          bio: string | null;
          avatar_url: string | null;
          steam_id: string | null;
          steam_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          bio?: string | null;
          avatar_url?: string | null;
          steam_id?: string | null;
          steam_synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          username?: string;
          bio?: string | null;
          avatar_url?: string | null;
          steam_id?: string | null;
          steam_synced_at?: string | null;
        };
        Relationships: [];
      };
      top_games: {
        Row: {
          user_id: string;
          game_igdb_id: number;
          position: 1 | 2 | 3;
        };
        Insert: {
          user_id: string;
          game_igdb_id: number;
          position: 1 | 2 | 3;
        };
        Update: {
          game_igdb_id?: number;
          position?: 1 | 2 | 3;
        };
        Relationships: [];
      };
      game_logs: {
        Row: {
          id: string;
          user_id: string;
          game_igdb_id: number;
          status: GameStatus;
          rating: number | null;
          review: string | null;
          is_liked: boolean;
          playtime_min: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          game_igdb_id: number;
          status: GameStatus;
          rating?: number | null;
          review?: string | null;
          is_liked?: boolean;
          playtime_min?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: GameStatus;
          rating?: number | null;
          review?: string | null;
          is_liked?: boolean;
          playtime_min?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: FriendshipStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: FriendshipStatus;
          created_at?: string;
        };
        Update: {
          status?: FriendshipStatus;
        };
        Relationships: [];
      };
      activity: {
        Row: {
          id: string;
          user_id: string;
          type: ActivityType;
          game_igdb_id: number;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: ActivityType;
          game_igdb_id: number;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          [_ in never]?: never;
        };
        Relationships: [];
      };
      lists: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          likes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          likes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          likes?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      list_games: {
        Row: {
          id: string;
          list_id: string;
          game_igdb_id: number;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          game_igdb_id: number;
          position: number;
          created_at?: string;
        };
        Update: {
          position?: number;
        };
        Relationships: [];
      };
      steam_library: {
        Row: {
          user_id: string;
          appid: number;
          name: string;
          playtime_min: number;
          playtime_2wk: number;
          game_igdb_id: number | null;
        };
        Insert: {
          user_id: string;
          appid: number;
          name: string;
          playtime_min?: number;
          playtime_2wk?: number;
          game_igdb_id?: number | null;
        };
        Update: {
          name?: string;
          playtime_min?: number;
          playtime_2wk?: number;
          game_igdb_id?: number | null;
        };
        Relationships: [];
      };
      user_profile_tags: {
        Row: {
          user_id: string;
          avatar_id: string | null;
          genres: string[];
          played_genres: string[];
          archetypes: string[];
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          avatar_id?: string | null;
          genres?: string[];
          played_genres?: string[];
          archetypes?: string[];
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          avatar_id?: string | null;
          genres?: string[];
          played_genres?: string[];
          archetypes?: string[];
          onboarding_completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      import_steam_logs: {
        Args: Record<string, never>;
        Returns: { imported: number; updated: number };
      };
    };
  };
}

// ── Singleton factory ───────────────────────────────────────────────────────

let _client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string
): SupabaseClient<Database> {
  if (_client) return _client;

  // Bypass navigator.locks which can deadlock when a previous tab's
  // session lock is never released (e.g. after a hard refresh).
  const noLock = <R>(_n: string, _t: number, fn: () => Promise<R>): Promise<R> => fn();

  _client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      lock: noLock,
    },
  }) as SupabaseClient<Database>;

  return _client;
}

// Re-export the type so consumers can type their variables
export type { SupabaseClient };
