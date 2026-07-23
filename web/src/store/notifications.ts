import { create } from "zustand";
import { getPendingRequests } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";

interface NotificationsStore {
  /** Number of incoming friend requests awaiting the user's response. */
  pendingRequests: number;
  /** Re-read the pending count for a user. Safe to call often; failures are silent. */
  refresh: (userId: string) => Promise<void>;
  /** Set directly when the caller already knows the count (e.g. FriendsPage). */
  setPending: (count: number) => void;
  clear: () => void;
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  pendingRequests: 0,
  refresh: async (userId) => {
    try {
      const pending = await getPendingRequests(supabase, userId);
      set({ pendingRequests: pending.length });
    } catch {
      // Non-critical — leave the last known count in place.
    }
  },
  setPending: (count) => set({ pendingRequests: count }),
  clear: () => set({ pendingRequests: 0 }),
}));
