import { DiskNextClient } from "@disknext/sdk";

export const client = new DiskNextClient({
  baseUrl: import.meta.env.VITE_API_URL || "",
});

// token 同步延迟到首次使用时初始化，避免循环依赖
let tokenSyncInitialized = false;

export function ensureTokenSync() {
  if (tokenSyncInitialized) return;
  tokenSyncInitialized = true;

  // 动态 import 打破循环
  import("@/stores/auth").then(({ useAuthStore }) => {
    client.setAccessToken(useAuthStore.getState().accessToken || null);
    useAuthStore.subscribe((state) => {
      client.setAccessToken(state.accessToken || null);
    });
  });
}
