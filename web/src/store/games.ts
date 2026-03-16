import { create } from "zustand";
import type { GameLogRow, TopGameRow, GameStatus } from "@gameboxd/lib";
import {
  upsertGameLog,
  getUserGameLogs,
  getTopGames,
  setTopGame,
  removeTopGame,
} from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "./auth";

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
    review?: string | null
  ) => Promise<GameLogRow>;
  setTopGame: (position: 1 | 2 | 3, gameIgdbId: number) => Promise<void>;
  removeTopGame: (position: 1 | 2 | 3) => Promise<void>;
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

  logGame: async (gameIgdbId, status, rating, review) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) throw new Error("Not authenticated");
    const log = await upsertGameLog(supabase, userId, gameIgdbId, status, rating, review);
    set((state) => ({
      logs: [log, ...state.logs.filter((l) => l.game_igdb_id !== gameIgdbId)],
    }));
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
