import { create } from "zustand";
import type { GameLogRow, TopGameRow, GameStatus } from "@gameboxd/lib";
import {
  upsertGameLog,
  getUserGameLogs,
  getTopGames,
  setTopGame,
  removeTopGame,
  upsertProfileTags,
  tagsFromIgdbGenres,
} from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "./auth";

// Rating (1–10) at or above which a game's genres are added to the user's
// played-genre profile and start driving recommendations.
const PLAYED_GENRE_RATING_THRESHOLD = 8;

interface GamesStore {
  logs: GameLogRow[];
  topGames: TopGameRow[];
  loading: boolean;
  fetchLogs: () => Promise<void>;
  fetchTopGames: () => Promise<void>;
  logGame: (
    gameIgdbId: number,
    status: GameStatus,
    rating?: number | null,
    review?: string | null,
    /** IGDB genre ids of the game — enables played-genre accumulation. */
    genreIds?: number[]
  ) => Promise<GameLogRow>;
  setTopGame: (position: 1 | 2 | 3, gameIgdbId: number) => Promise<void>;
  removeTopGame: (position: 1 | 2 | 3) => Promise<void>;
}

/**
 * Merge a highly-rated game's genres into the user's played-genre profile.
 * Runs fire-and-forget after a log; failures are swallowed so they never
 * disrupt the logging flow.
 */
async function accumulatePlayedGenres(userId: string, genreIds: number[]): Promise<void> {
  try {
    const newTags = tagsFromIgdbGenres(genreIds);
    if (newTags.length === 0) return;

    const { profileTags, setProfileTags } = useAuthStore.getState();
    const existing = profileTags?.played_genres ?? [];
    const merged = [...new Set([...existing, ...newTags])];
    if (merged.length === existing.length) return; // nothing new

    const saved = await upsertProfileTags(supabase, userId, { played_genres: merged });
    setProfileTags(saved);
  } catch {
    // Non-critical enrichment — ignore.
  }
}

export const useGamesStore = create<GamesStore>((set) => ({
  logs: [],
  topGames: [],
  loading: false,

  fetchLogs: async () => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    set({ loading: true });
    try {
      const logs = await getUserGameLogs(supabase, userId);
      set({ logs });
    } finally {
      set({ loading: false });
    }
  },

  fetchTopGames: async () => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    const topGames = await getTopGames(supabase, userId);
    set({ topGames });
  },

  logGame: async (gameIgdbId, status, rating, review, genreIds) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) throw new Error("Not authenticated");
    const log = await upsertGameLog(supabase, userId, gameIgdbId, status, rating, review);
    set((state) => ({
      logs: [log, ...state.logs.filter((l) => l.game_igdb_id !== gameIgdbId)],
    }));

    // Rating a game highly teaches the recommender: fold that game's genres
    // into the user's played-genre profile (best-effort — never blocks the log).
    if (rating != null && rating >= PLAYED_GENRE_RATING_THRESHOLD && genreIds && genreIds.length > 0) {
      void accumulatePlayedGenres(userId, genreIds);
    }

    return log;
  },

  setTopGame: async (position, gameIgdbId) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) throw new Error("Not authenticated");
    await setTopGame(supabase, userId, position, gameIgdbId);
    set((state) => {
      const updated = state.topGames.filter((g) => g.position !== position);
      return {
        topGames: [...updated, { user_id: userId, position, game_igdb_id: gameIgdbId }],
      };
    });
  },

  removeTopGame: async (position) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) throw new Error("Not authenticated");
    await removeTopGame(supabase, userId, position);
    set((state) => ({
      topGames: state.topGames.filter((g) => g.position !== position),
    }));
  },
}));
