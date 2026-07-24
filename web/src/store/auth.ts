import { create } from "zustand";
import type { UserRow, UserProfileTagsRow } from "@gameboxd/lib";
import { signIn, signUp, signOut } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";

interface AuthStore {
  profile: UserRow | null;
  profileTags: UserProfileTagsRow | null;
  profileTagsLoaded: boolean;
  userId: string | null;
  loading: boolean;
  initialized: boolean;
  setProfile: (profile: UserRow | null) => void;
  setProfileTags: (tags: UserProfileTagsRow | null) => void;
  setUserId: (id: string | null) => void;
  setInitialized: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<{ needsConfirmation: boolean }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  profile: null,
  profileTags: null,
  profileTagsLoaded: false,
  userId: null,
  loading: false,
  initialized: false,
  setInitialized: () => set({ initialized: true }),
  setProfile: (profile) => set({ profile }),
  // Marks tags as loaded (resolved or absent) so the onboarding gate can tell
  // "still fetching" apart from "no row yet".
  setProfileTags: (profileTags) => set({ profileTags, profileTagsLoaded: true }),
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
    set({ profile: null, profileTags: null, profileTagsLoaded: false, userId: null });
  },
}));
