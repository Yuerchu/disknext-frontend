// ==================== API 函数 ====================
// URL 严格匹配后端定义，不多不少尾部斜杠

import { http } from "./axios";
import type {
  UnifiedAuthRequest, TokenResponse, MagicLinkRequest,
  UserResponse, UserStorageResponse,
  SiteConfigResponse,
  DirectoryResponse, DirectoryCreateRequest, CreateFileRequest,
  EntryUpdateRequest, EntryDeleteRequest,
  CreateUploadSessionRequest, UploadSessionResponse, UploadChunkResponse,
  ShareListResponse, ShareListParams, ShareCreateRequest, ShareCreateResponse,
} from "./types";

// 重导出
export { http, ApiError } from "./axios";
export type * from "./types";

import i18n from "@/i18n";
import { ApiError } from "./axios";

export function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const i18nKey = `errorCodes.${error.code}`;
    const translated = i18n.t(i18nKey, { defaultValue: "" });
    if (translated && translated !== i18nKey) return translated;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

// --- 认证 ---

export const auth = {
  login: (req: UnifiedAuthRequest) =>
    http.post<TokenResponse>("/api/v1/user/session", req).then((r) => r.data),

  register: (req: UnifiedAuthRequest) =>
    http.post<void>("/api/v1/user", req),

  /** refresh token 放在 Authorization header 中 */
  refresh: (refreshToken: string) =>
    http.post<TokenResponse>("/api/v1/user/session/refresh", null, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    }).then((r) => r.data),

  sendMagicLink: (req: MagicLinkRequest) =>
    http.post<void>("/api/v1/user/magic-link", req),
};

// --- 用户 ---

export const user = {
  me: () =>
    http.get<UserResponse>("/api/v1/user/me").then((r) => r.data),

  storage: () =>
    http.get<UserStorageResponse>("/api/v1/user/storage").then((r) => r.data),
};

// --- 站点 ---

export const site = {
  getConfig: () =>
    http.get<SiteConfigResponse>("/api/v1/site/config").then((r) => r.data),
};

// --- 管理 ---

export const admin = {
  checkAdmin: async (): Promise<boolean> => {
    try {
      const res = await http.get("/api/v1/admin/");
      return res.status === 204;
    } catch {
      return false;
    }
  },
};

// --- 文件/目录 ---
// directory 端点带尾部斜杠（因为后面有 {path} 参数）

export const file = {
  getRootDirectory: () =>
    http.get<DirectoryResponse>("/api/v1/directory/").then((r) => r.data),

  getDirectoryByPath: (path: string) => {
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    return http.get<DirectoryResponse>(`/api/v1/directory/${encoded}`).then((r) => r.data);
  },

  createDirectory: (req: DirectoryCreateRequest) =>
    http.post<void>("/api/v1/directory/", req),

  createFile: (req: CreateFileRequest) =>
    http.post<void>("/api/v1/object/", req),

  updateObject: (id: string, req: EntryUpdateRequest) =>
    http.patch<void>(`/api/v1/object/${id}`, req),

  deleteObjects: (req: EntryDeleteRequest) =>
    http.delete<void>("/api/v1/object/", { data: req }),

  moveObjects: (req: { src_ids: string[]; dst_id: string }) =>
    http.patch<void>("/api/v1/object/", req),

  copyObjects: (req: { src_ids: string[]; dst_id: string }) =>
    http.post<void>("/api/v1/object/copies", req),

  createDownloadToken: (fileId: string) =>
    http.post<{ access_token: string; access_expires: string }>(`/api/v1/file/download/${fileId}`).then((r) => r.data),

  getThumbUrl: (id: string): string =>
    `${import.meta.env.VITE_API_URL || ""}/api/v1/file/thumb/${id}`,

  createUploadSession: (req: CreateUploadSessionRequest) =>
    http.post<UploadSessionResponse>("/api/v1/file/upload", req).then((r) => r.data),

  uploadChunk: (sessionId: string, chunkIndex: number, fileBlob: Blob) => {
    const formData = new FormData();
    formData.append("file", fileBlob);
    return http.post<UploadChunkResponse>(
      `/api/v1/file/upload/${sessionId}/${chunkIndex}`,
      formData,
    ).then((r) => r.data);
  },
};

// --- 分享 ---

export const share = {
  list: (params?: ShareListParams) =>
    http.get<ShareListResponse>("/api/v1/share/", { params }).then((r) => r.data),

  create: (req: ShareCreateRequest) =>
    http.post<ShareCreateResponse>("/api/v1/share/", req).then((r) => r.data),

  delete: (id: string) =>
    http.delete<void>(`/api/v1/share/${id}`),
};
