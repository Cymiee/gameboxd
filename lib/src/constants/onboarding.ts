// ── Genre preferences ────────────────────────────────────────────────────────

export const GENRE_TAGS = [
  "fps",
  "rpg",
  "moba",
  "battle_royale",
  "strategy",
  "sports",
  "simulation",
  "horror",
  "platformer",
  "roguelike",
  "action_adventure",
  "puzzle",
  "racing",
  "sandbox",
] as const;

export type GenreTag = (typeof GENRE_TAGS)[number];

export const GENRE_LABELS: Record<GenreTag, string> = {
  fps: "FPS",
  rpg: "RPG",
  moba: "MOBA",
  battle_royale: "Battle Royale",
  strategy: "Strategy",
  sports: "Sports",
  simulation: "Simulation",
  horror: "Horror",
  platformer: "Platformer",
  roguelike: "Roguelike",
  action_adventure: "Action-Adventure",
  puzzle: "Puzzle",
  racing: "Racing",
  sandbox: "Sandbox",
};

export const MIN_GENRES = 1;
export const MAX_GENRES = 6;

/**
 * Reverse lookup: given the IGDB genre ids of a game, return the onboarding
 * genre tags that game matches. Used to accumulate "played genres" from the
 * games a user rates highly. (Theme-only tags like horror/sandbox can't be
 * derived here since client game data carries genres, not themes.)
 */
export function tagsFromIgdbGenres(genreIds: number[]): GenreTag[] {
  const ids = new Set(genreIds);
  return GENRE_TAGS.filter((tag) => GENRE_IGDB_MAP[tag].genres.some((id) => ids.has(id)));
}

/**
 * Maps each onboarding genre tag to IGDB genre and/or theme ids, so the
 * genres a user selects can drive game recommendations. IGDB splits some of
 * our tags across genres (e.g. Shooter) and themes (e.g. Horror, Sandbox),
 * hence both lists. Best-effort — a few tags (roguelike) have no exact IGDB
 * equivalent and use the closest proxy.
 */
export const GENRE_IGDB_MAP: Record<GenreTag, { genres: number[]; themes: number[] }> = {
  fps:              { genres: [5],         themes: [] },     // Shooter
  rpg:              { genres: [12],        themes: [] },     // Role-playing
  moba:             { genres: [36],        themes: [] },     // MOBA
  battle_royale:    { genres: [5],         themes: [21] },   // Shooter + Survival
  strategy:         { genres: [15, 11, 16], themes: [] },    // Strategy, RTS, TBS
  sports:           { genres: [14],        themes: [] },     // Sport
  simulation:       { genres: [13],        themes: [] },     // Simulator
  horror:           { genres: [],          themes: [19] },   // Horror (theme)
  platformer:       { genres: [8],         themes: [] },     // Platform
  roguelike:        { genres: [12, 33],    themes: [] },     // RPG + Arcade (proxy)
  action_adventure: { genres: [31, 25],    themes: [1] },    // Adventure, Hack & Slash + Action
  puzzle:           { genres: [9],         themes: [] },     // Puzzle
  racing:           { genres: [10],        themes: [] },     // Racing
  sandbox:          { genres: [],          themes: [33, 38] }, // Sandbox + Open World (themes)
};

// ── Gamer archetypes ─────────────────────────────────────────────────────────

export const ARCHETYPE_TAGS = [
  "achievement_hunter",
  "completionist",
  "speedrunner",
  "casual_chill",
  "competitive_grinder",
  "story_explorer",
  "social_coop",
] as const;

export type ArchetypeTag = (typeof ARCHETYPE_TAGS)[number];

export interface ArchetypeMeta {
  id: ArchetypeTag;
  label: string;
  emoji: string;
  description: string;
}

export const ARCHETYPES: ArchetypeMeta[] = [
  {
    id: "achievement_hunter",
    label: "Achievement Hunter",
    emoji: "🏆",
    description: "100% or bust — you chase every trophy and achievement.",
  },
  {
    id: "completionist",
    label: "Completionist",
    emoji: "🗺️",
    description: "Side quests, collectibles, hidden corners — you leave nothing behind.",
  },
  {
    id: "speedrunner",
    label: "Speedrunner",
    emoji: "⏱️",
    description: "Every second counts — you optimize routes and beat your own best.",
  },
  {
    id: "casual_chill",
    label: "Casual / Chill",
    emoji: "🌿",
    description: "You play to unwind, at your own pace, no pressure.",
  },
  {
    id: "competitive_grinder",
    label: "Competitive / Ranked Grinder",
    emoji: "🔥",
    description: "Climbing the ladder is the whole point — rank up or go home.",
  },
  {
    id: "story_explorer",
    label: "Story-Driven Explorer",
    emoji: "📖",
    description: "You're here for the world, the characters, and the ending.",
  },
  {
    id: "social_coop",
    label: "Social / Co-op Player",
    emoji: "🎉",
    description: "Games are better with friends — you play to be together.",
  },
];

export const MAX_ARCHETYPES = 3;

// ── Avatar presets ───────────────────────────────────────────────────────────
// No upload/storage — a fixed set of icon+color combos, referenced by id.

export interface AvatarPreset {
  id: string;
  emoji: string;
  color: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "controller", emoji: "🎮", color: "#e4ff1a" },
  { id: "sword", emoji: "⚔️", color: "#5b8cff" },
  { id: "shield", emoji: "🛡️", color: "#7c4dff" },
  { id: "dragon", emoji: "🐉", color: "#ff6b6b" },
  { id: "ghost", emoji: "👻", color: "#a78bfa" },
  { id: "rocket", emoji: "🚀", color: "#38bdf8" },
  { id: "skull", emoji: "💀", color: "#94a3b8" },
  { id: "crown", emoji: "👑", color: "#fbbf24" },
  { id: "fire", emoji: "🔥", color: "#fb7185" },
  { id: "star", emoji: "⭐", color: "#facc15" },
  { id: "alien", emoji: "👽", color: "#4ade80" },
  { id: "robot", emoji: "🤖", color: "#60a5fa" },
];
