// ==================== API 函数 ====================
// URL 严格匹配后端定义，不多不少尾部斜杠

import { http } from "./axios";
import type {
  EmailLoginRequest, PhoneSmsLoginRequest, GithubLoginRequest,
  QQLoginRequest, PasskeyLoginRequest, RegisterRequest, TokenResponse,
  UserResponse, UserStorageResponse,
  SiteConfigResponse,
  DirectoryResponse, DirectoryCreateRequest, CreateFileRequest,
  EntryUpdateRequest, EntryDeleteRequest,
  CreateUploadSessionRequest, UploadSessionResponse, UploadChunkResponse,
  TrashItemResponse, TrashDeleteRequest, TrashRestoreRequest,
  ShareListResponse, ShareListParams, ShareCreateRequest, ShareCreateResponse,
  SiteSettingsResponse, SiteSettingsUpdate,
  RegisterSettingsResponse, RegisterSettingsUpdate,
  CaptchaSettingsResponse, CaptchaSettingsUpdate,
  MailSettingsResponse, MailSettingsUpdate,
  AvatarSettingsResponse, AvatarSettingsUpdate,
  PwaSettingsResponse, PwaSettingsUpdate,
  AppearanceSettingsResponse, AppearanceSettingsUpdate,
  TaskSettingsResponse, TaskSettingsUpdate,
  AdvancedSettingsResponse, AdvancedSettingsUpdate,
  ListResponse, PaginationParams,
  AdminGroupResponse, AdminGroupCreateRequest, AdminGroupUpdateRequest,
  AdminUserResponse, AdminUserCreateRequest, AdminUserUpdateRequest,
  AdminUserListParams, AdminCalibrateResponse,
  ScopeMetadataResponse,
  AdminSummaryResponse,
  UserSettingResponse, UserSettingUpdateRequest,
  ChangePasswordRequest,
  TwoFactorSetupResponse, TwoFactorEnableRequest,
  AuthnDetailResponse, AuthnRenameRequest, AuthnFinishRequest,
  UserFileAppDefaultResponse, SetDefaultViewerRequest,
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
  loginEmail: (req: EmailLoginRequest) =>
    http.post<TokenResponse>("/api/v1/user/session/email", req).then((r) => r.data),

  loginPhone: (req: PhoneSmsLoginRequest) =>
    http.post<TokenResponse>("/api/v1/user/session/phone", req).then((r) => r.data),

  loginGithub: (req: GithubLoginRequest) =>
    http.post<TokenResponse>("/api/v1/user/session/github", req).then((r) => r.data),

  loginQQ: (req: QQLoginRequest) =>
    http.post<TokenResponse>("/api/v1/user/session/qq", req).then((r) => r.data),

  loginPasskey: (req: PasskeyLoginRequest) =>
    http.post<TokenResponse>("/api/v1/user/session/passkey", req).then((r) => r.data),

  register: (req: RegisterRequest) =>
    http.post<void>("/api/v1/user", req),

  /** refresh token 放在 Authorization header 中 */
  refresh: (refreshToken: string) =>
    http.post<TokenResponse>("/api/v1/user/session/refresh", null, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    }).then((r) => r.data),
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

  summary: () =>
    http.get<AdminSummaryResponse>("/api/v1/admin/summary").then((r) => r.data),
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

// --- 回收站 ---

export const trash = {
  list: () =>
    http.get<TrashItemResponse[]>("/api/v1/trash/").then((r) => r.data),

  delete: (req: TrashDeleteRequest) =>
    http.delete<void>("/api/v1/trash/", { data: req }),

  restore: (req: TrashRestoreRequest) =>
    http.patch<void>("/api/v1/trash/restore", req),
};

// --- 管理员：权限元数据 ---

export const adminScope = {
  metadata: () =>
    http.get<ScopeMetadataResponse>("/api/v1/admin/scope/metadata").then((r) => r.data),
};

// --- 管理员：用户组 ---

export const adminGroup = {
  list: (params?: PaginationParams) =>
    http.get<ListResponse<AdminGroupResponse>>("/api/v1/admin/group/", { params }).then((r) => r.data),

  create: (req: AdminGroupCreateRequest) =>
    http.post<void>("/api/v1/admin/group/", req),

  get: (groupId: string) =>
    http.get<AdminGroupResponse>(`/api/v1/admin/group/${groupId}`).then((r) => r.data),

  update: (groupId: string, req: AdminGroupUpdateRequest) =>
    http.patch<void>(`/api/v1/admin/group/${groupId}`, req),

  delete: (groupId: string) =>
    http.delete<void>(`/api/v1/admin/group/${groupId}`),

  members: (groupId: string, params?: PaginationParams) =>
    http.get<ListResponse<AdminUserResponse>>(`/api/v1/admin/group/list/${groupId}`, { params }).then((r) => r.data),
};

// --- 管理员：用户 ---

export const adminUser = {
  list: (params?: AdminUserListParams) =>
    http.get<ListResponse<AdminUserResponse>>("/api/v1/admin/user/", { params }).then((r) => r.data),

  create: (req: AdminUserCreateRequest) =>
    http.post<AdminUserResponse>("/api/v1/admin/user/", req).then((r) => r.data),

  get: (userId: string) =>
    http.get<AdminUserResponse>(`/api/v1/admin/user/${userId}`).then((r) => r.data),

  update: (userId: string, req: AdminUserUpdateRequest) =>
    http.patch<void>(`/api/v1/admin/user/${userId}`, req),

  delete: (ids: string[]) =>
    http.delete<void>("/api/v1/admin/user/", { data: { ids } }),

  calibrate: (userId: string) =>
    http.post<AdminCalibrateResponse>(`/api/v1/admin/user/calibrate/${userId}`).then((r) => r.data),
};

// --- 管理员设置 ---

function settingsApi<R, U>(path: string) {
  return {
    get: () => http.get<R>(`/api/v1/admin/settings/${path}`).then((r) => r.data),
    update: (data: U) => http.patch<void>(`/api/v1/admin/settings/${path}`, data),
  };
}

export const adminSettings = {
  site: settingsApi<SiteSettingsResponse, SiteSettingsUpdate>("site"),
  register: settingsApi<RegisterSettingsResponse, RegisterSettingsUpdate>("register"),
  captcha: settingsApi<CaptchaSettingsResponse, CaptchaSettingsUpdate>("captcha"),
  mail: settingsApi<MailSettingsResponse, MailSettingsUpdate>("mail"),
  avatar: settingsApi<AvatarSettingsResponse, AvatarSettingsUpdate>("avatar"),
  pwa: settingsApi<PwaSettingsResponse, PwaSettingsUpdate>("pwa"),
  appearance: settingsApi<AppearanceSettingsResponse, AppearanceSettingsUpdate>("appearance"),
  task: settingsApi<TaskSettingsResponse, TaskSettingsUpdate>("task"),
  advanced: settingsApi<AdvancedSettingsResponse, AdvancedSettingsUpdate>("advanced"),
};

// --- 用户设置 ---

export const userSettings = {
  get: () =>
    http.get<UserSettingResponse>("/api/v1/user/settings/").then((r) => r.data),

  update: (data: Partial<UserSettingUpdateRequest>) =>
    http.patch<void>("/api/v1/user/settings/", data),

  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return http.post<void>("/api/v1/user/settings/avatar", fd);
  },

  switchToGravatar: () =>
    http.put<void>("/api/v1/user/settings/avatar"),

  resetAvatar: () =>
    http.delete<void>("/api/v1/user/settings/avatar"),

  changePassword: (data: ChangePasswordRequest) =>
    http.patch<void>("/api/v1/user/settings/password", data),

  get2FASetup: () =>
    http.get<TwoFactorSetupResponse>("/api/v1/user/settings/2fa").then((r) => r.data),

  enable2FA: (data: TwoFactorEnableRequest) =>
    http.post<void>("/api/v1/user/settings/2fa", data),

  listAuthns: () =>
    http.get<AuthnDetailResponse[]>("/api/v1/user/settings/authns").then((r) => r.data),

  renameAuthn: (id: string, data: AuthnRenameRequest) =>
    http.patch<AuthnDetailResponse>(`/api/v1/user/settings/authn/${id}`, data).then((r) => r.data),

  deleteAuthn: (id: string) =>
    http.delete<void>(`/api/v1/user/settings/authn/${id}`),

  startPasskeyRegistration: () =>
    http.post("/api/v1/user/authn/registration").then((r) => r.data),

  finishPasskeyRegistration: (data: AuthnFinishRequest) =>
    http.put<AuthnDetailResponse>("/api/v1/user/authn/registration", data).then((r) => r.data),

  listDefaultViewers: () =>
    http.get<UserFileAppDefaultResponse[]>("/api/v1/user/settings/file_viewers/defaults").then((r) => r.data),

  setDefaultViewer: (data: SetDefaultViewerRequest) =>
    http.put<UserFileAppDefaultResponse>("/api/v1/user/settings/file_viewers/default", data).then((r) => r.data),

  deleteDefaultViewer: (id: string) =>
    http.delete<void>(`/api/v1/user/settings/file_viewers/default/${id}`),
};
