import { create } from "zustand";
import type { UserResponse, UserStorageResponse } from "@disknext/sdk";
import { client } from "@/client";

interface UserState {
  profile: UserResponse | null;
  storage: UserStorageResponse | null;
  isAdmin: boolean;
  lastError: string | null;

  fetchProfile: () => Promise<void>;
  fetchStorage: () => Promise<void>;
  checkAdmin: () => Promise<void>;
  clear: () => void;
}

export const useUserStore = create<UserState>()((set) => ({
  profile: null,
  storage: null,
  isAdmin: false,
  lastError: null,

  fetchProfile: async () => {
    try {
      const profile = await client.user.me();
      set({ profile, lastError: null });
    } catch (e) {
      set({ lastError: e instanceof Error ? e.message : "Failed to fetch profile" });
    }
  },

  fetchStorage: async () => {
    try {
      const storage = await client.user.storage();
      set({ storage, lastError: null });
    } catch (e) {
      set({ lastError: e instanceof Error ? e.message : "Failed to fetch storage" });
    }
  },

  checkAdmin: async () => {
    const isAdmin = await client.admin.checkAdmin();
    set({ isAdmin });
  },

  clear: () => set({ profile: null, storage: null, isAdmin: false, lastError: null }),
}));
