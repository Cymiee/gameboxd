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
// A fixed selection of DiceBear "Bottts" robot avatars, referenced by id.
// Rendered from the DiceBear HTTP API — no upload/storage. `color` is the
// avatar's background (also the fallback tint while the SVG loads).

/** DiceBear collection used for preset avatars. */
export const AVATAR_STYLE = "bottts";

export interface AvatarPreset {
  id: string;
  /** DiceBear seed — deterministic; changing it changes the robot. */
  seed: string;
  /** Background colour for the avatar (hex, with leading #). */
  color: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "nova",    seed: "Nova",    color: "#e0a82e" },
  { id: "bolt",    seed: "Bolt",    color: "#f0736a" },
  { id: "glitch",  seed: "Glitch",  color: "#a98cd9" },
  { id: "circuit", seed: "Circuit", color: "#5b9dd9" },
  { id: "volt",    seed: "Volt",    color: "#4ca97e" },
  { id: "byte",    seed: "Byte",    color: "#c9788c" },
  { id: "quark",   seed: "Quark",   color: "#5bc0be" },
  { id: "turbo",   seed: "Turbo",   color: "#efbb47" },
  { id: "zap",     seed: "Zap",     color: "#7c8cff" },
  { id: "rogue",   seed: "Rogue",   color: "#ff9f57" },
  { id: "pixel",   seed: "Pixel",   color: "#6ec1e4" },
  { id: "jinx",    seed: "Jinx",    color: "#b8d84a" },
  { id: "nyx",     seed: "Nyx",     color: "#d98cae" },
  { id: "echo",    seed: "Echo",    color: "#8ad6b5" },
  { id: "flux",    seed: "Flux",    color: "#9b8cff" },
];

/** Build the DiceBear SVG URL for a preset avatar. */
export function dicebearAvatarUrl(preset: AvatarPreset): string {
  const bg = preset.color.replace("#", "");
  return `https://api.dicebear.com/9.x/${AVATAR_STYLE}/svg?seed=${encodeURIComponent(preset.seed)}&backgroundColor=${bg}&radius=50`;
}
