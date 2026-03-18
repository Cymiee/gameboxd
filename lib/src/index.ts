// Types
export * from "./types/index.js";

// Supabase client
export { getSupabaseClient } from "./supabase/client.js";
export type { Database, SupabaseClient } from "./supabase/client.js";

// Auth helpers
export { signUp, signIn, signOut, getProfile, updateProfile } from "./supabase/auth.js";

// Game helpers
export {
  upsertGameLog,
  getUserGameLogs,
  getTopGames,
  setTopGame,
  removeTopGame,
  toggleFavourite,
} from "./supabase/games.js";

// Friends helpers
export {
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  getPendingRequests,
  getFriendsActivityFeed,
} from "./supabase/friends.js";

// IGDB
export { createIGDBClient, getCoverUrl } from "./igdb/client.js";
export type { CoverSize } from "./igdb/client.js";
export { fetchIGDBAccessToken } from "./igdb/token.js";

// Hooks
export { useAuth } from "./hooks/useAuth.js";
export type { UseAuthReturn } from "./hooks/useAuth.js";
export { useGameLog } from "./hooks/useGameLog.js";
