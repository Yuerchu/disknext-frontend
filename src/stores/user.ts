import { create } from "zustand";
import type { UserResponse, UserStorageResponse } from "@/api";
import { user } from "@/api";
import { hasAnyAdminScope } from "@/lib/ability";

interface UserState {
  profile: UserResponse | null;
  storage: UserStorageResponse | null;
  lastError: string | null;

  /** 是否拥有任意 admin.* scope（从 profile.scopes 派生） */
  isAdmin: boolean;

  fetchProfile: () => Promise<void>;
  fetchStorage: () => Promise<void>;
  clear: () => void;
}

export const useUserStore = create<UserState>()((set) => ({
  profile: null,
  storage: null,
  isAdmin: false,
  lastError: null,

  fetchProfile: async () => {
    try {
      const profile = await user.me();
      set({
        profile,
        isAdmin: hasAnyAdminScope(profile.scopes ?? []),
        lastError: null,
      });
    } catch (e) {
      set({ lastError: e instanceof Error ? e.message : "Failed to fetch profile" });
    }
  },

  fetchStorage: async () => {
    try {
      const storage = await user.storage();
      set({ storage, lastError: null });
    } catch (e) {
      set({ lastError: e instanceof Error ? e.message : "Failed to fetch storage" });
    }
  },

  clear: () => set({ profile: null, storage: null, isAdmin: false, lastError: null }),
}));
