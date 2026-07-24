// Types
export * from "./types/index.js";

// Supabase client
export { getSupabaseClient } from "./supabase/client.js";
export type { Database, SupabaseClient } from "./supabase/client.js";

// Auth helpers
export {
  signUp,
  signIn,
  signOut,
  getProfile,
  updateProfile,
  ensureProfile,
  getUsersByIds,
  getUserByUsername,
} from "./supabase/auth.js";

// Game helpers
export {
  upsertGameLog,
  getUserGameLogs,
  deleteGameLog,
  getTopGames,
  setTopGame,
  removeTopGame,
  toggleLike,
} from "./supabase/games.js";

// Friends helpers
export {
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  getPendingRequests,
  getFriendshipStatus,
  declineFriendRequest,
  removeFriend,
  getFriendsActivityFeed,
  getPopularAmongFriends,
  getFriendRatingsForGame,
} from "./supabase/friends.js";
export type { FriendStatusResult, FriendRating } from "./supabase/friends.js";

// Activity helpers
export {
  getActivityWithUsers,
  getFriendsActivity,
  getUserActivity,
  getTrendingGameIds,
  getMostPlayedThisWeek,
  getRecentReviews,
  getUserStats,
  getPopularLists,
} from "./supabase/activity.js";
export type { ActivityWithUser, TrendingGameEntry, ReviewWithUser } from "./supabase/activity.js";

// Lists helpers
export {
  getPopularListsWithMeta,
  getListsByUser,
  getListWithGames,
  createList,
  updateList,
  deleteList,
  addGameToList,
  removeGameFromList,
} from "./supabase/lists.js";
export type { ListWithMeta, ListWithGames } from "./supabase/lists.js";

// Profile tags (onboarding: avatar, genres, archetypes)
export { getProfileTags, upsertProfileTags } from "./supabase/profileTags.js";
export type { ProfileTagsUpdate } from "./supabase/profileTags.js";

// Onboarding constants
export {
  GENRE_TAGS,
  GENRE_LABELS,
  MIN_GENRES,
  MAX_GENRES,
  ARCHETYPE_TAGS,
  ARCHETYPES,
  MAX_ARCHETYPES,
  AVATAR_PRESETS,
} from "./constants/onboarding.js";
export type { GenreTag, ArchetypeTag, ArchetypeMeta, AvatarPreset } from "./constants/onboarding.js";

// IGDB
export { createIGDBClient, getCoverUrl } from "./igdb/client.js";
export type { CoverSize } from "./igdb/client.js";
export { fetchIGDBAccessToken } from "./igdb/token.js";
