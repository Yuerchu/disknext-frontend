import { create } from "zustand";
import type { SiteConfigResponse } from "@disknext/sdk";
import { client } from "@/client";

interface SiteConfigState {
  config: SiteConfigResponse | null;
  lastError: string | null;
  fetch: () => Promise<void>;
}

export const useSiteConfigStore = create<SiteConfigState>()((set) => ({
  config: null,
  lastError: null,

  fetch: async () => {
    try {
      const config = await client.site.getConfig();
      set({ config, lastError: null });
    } catch (e) {
      set({ lastError: e instanceof Error ? e.message : "Failed to fetch site config" });
    }
  },
}));
