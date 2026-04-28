import axios from "axios";
import { useAuthStore } from "@/stores/auth";

/** 全局 axios 实例，所有 API 请求都走这里 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || undefined,
  headers: { "Content-Type": "application/json" },
});

// --- Token 自动注入 ---

function syncToken(token: string) {
  if (token) {
    http.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common["Authorization"];
  }
}

// 从 persisted store 恢复
syncToken(useAuthStore.getState().accessToken);

// store 变化时同步
useAuthStore.subscribe((state) => syncToken(state.accessToken));

// --- 401 自动刷新拦截器 ---

let refreshing: Promise<boolean> | null = null;

http.interceptors.response.use(undefined, async (error) => {
  if (!axios.isAxiosError(error) || !error.response || !error.config) throw error;

  const status = error.response.status;
  const config = error.config as typeof error.config & { _retried?: boolean };

  if (status === 401 && !config._retried) {
    // 不重试 refresh 请求本身
    if (config.url?.includes("/session/refresh")) {
      useAuthStore.getState().logout();
      throw error;
    }

    // 并发请求共享一个 refresh
    if (!refreshing) {
      refreshing = useAuthStore.getState().refresh().finally(() => { refreshing = null; });
    }

    const ok = await refreshing;
    if (!ok) {
      useAuthStore.getState().logout();
      throw error;
    }

    config._retried = true;
    // 用刷新后的新 token 替换旧 token
    config.headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
    return http.request(config);
  }

  throw error;
});

// --- ApiError ---

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly body: unknown;

  constructor(status: number, code: string, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.body = body;
  }

  static fromAxios(error: unknown): ApiError {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;
      const detail = data?.detail;

      // { detail: { code, message } }
      if (typeof detail === "object" && detail !== null && "code" in detail) {
        return new ApiError(status, detail.code, detail.message ?? detail.code, data);
      }
      // { detail: "string" }
      if (typeof detail === "string") {
        return new ApiError(status, `http.${status}`, detail, data);
      }
      // 422 Pydantic
      if (Array.isArray(detail) && detail.length > 0) {
        return new ApiError(status, "validation.error", detail[0].msg ?? "Validation error", data);
      }

      return new ApiError(status, `http.${status}`, `HTTP ${status}`, data);
    }

    if (error instanceof Error) return new ApiError(0, "network", error.message);
    return new ApiError(0, "unknown", String(error));
  }

  is(code: string): boolean {
    return this.code === code;
  }
}
