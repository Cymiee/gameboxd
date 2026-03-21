import { create } from "zustand";
import type { UserRow } from "@gameboxd/lib";
import { signIn, signUp, signOut } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";

interface AuthStore {
  profile: UserRow | null;
  userId: string | null;
  loading: boolean;
  initialized: boolean;
  setProfile: (profile: UserRow | null) => void;
  setUserId: (id: string | null) => void;
  setInitialized: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<{ needsConfirmation: boolean }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  profile: null,
  userId: null,
  loading: false,
  initialized: false,
  setInitialized: () => set({ initialized: true }),
  setProfile: (profile) => set({ profile }),
  setUserId: (userId) => set({ userId }),
  login: async (email, password) => {
    set({ loading: true });
    try {
      const { userId } = await signIn(supabase, email, password);
      set({ userId });
    } finally {
      set({ loading: false });
    }
  },
  register: async (email, password, username) => {
    set({ loading: true });
    try {
      const { userId, needsConfirmation } = await signUp(supabase, email, password, username);
      if (!needsConfirmation) set({ userId });
      return { needsConfirmation };
    } finally {
      set({ loading: false });
    }
  },
  logout: async () => {
    await signOut(supabase);
    set({ profile: null, userId: null });
  },
}));
