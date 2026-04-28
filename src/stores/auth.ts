import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TokenResponse } from "@/api";
import { auth } from "@/api";

let refreshInProgress: Promise<boolean> | null = null;

interface AuthState {
  accessToken: string;
  refreshToken: string;
  accessExpires: string;
  refreshExpires: string;
  instanceId: string;

  isAuthenticated: () => boolean;
  isAccessExpired: () => boolean;
  isRefreshExpired: () => boolean;

  setSession: (data: TokenResponse) => void;
  refresh: () => Promise<boolean>;
  ensureAuthenticated: () => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: "",
      refreshToken: "",
      accessExpires: "",
      refreshExpires: "",
      instanceId: "",

      isAuthenticated: () => !!get().accessToken,

      isAccessExpired: () => {
        const { accessExpires } = get();
        if (!accessExpires) return true;
        return new Date(accessExpires) <= new Date();
      },

      isRefreshExpired: () => {
        const { refreshExpires } = get();
        if (!refreshExpires) return true;
        return new Date(refreshExpires) <= new Date();
      },

      setSession: (data: TokenResponse) => {
        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          accessExpires: data.access_expires,
          refreshExpires: data.refresh_expires,
          instanceId: data.instance_id ?? get().instanceId,
        });
      },

      refresh: async () => {
        if (refreshInProgress) return refreshInProgress;

        refreshInProgress = (async () => {
          try {
            const { refreshToken } = get();
            if (!refreshToken) return false;
            const data = await auth.refresh(refreshToken);
            get().setSession(data);
            return true;
          } catch {
            get().logout();
            return false;
          } finally {
            refreshInProgress = null;
          }
        })();

        return refreshInProgress;
      },

      ensureAuthenticated: async () => {
        if (!get().isAuthenticated()) return false;
        if (!get().isAccessExpired()) return true;
        if (get().isRefreshExpired()) {
          get().logout();
          return false;
        }
        return get().refresh();
      },

      logout: () => {
        set({
          accessToken: "",
          refreshToken: "",
          accessExpires: "",
          refreshExpires: "",
          instanceId: "",
        });
      },
    }),
    {
      name: "auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        accessExpires: state.accessExpires,
        refreshExpires: state.refreshExpires,
        instanceId: state.instanceId,
      }),
    },
  ),
);
