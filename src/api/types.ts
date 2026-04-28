// ==================== API 数据类型 ====================
// 严格对应后端 DTO

// --- 通用 ---

export interface ResponseBase {
  instance_id?: string;
}

// --- 认证 ---

export type AuthProviderType = "email_password" | "phone_sms" | "github" | "qq" | "passkey" | "magic_link";

export interface UnifiedAuthRequest {
  provider: AuthProviderType;
  identifier: string;
  credential?: string | null;
  two_fa_code?: string | null;
  redirect_uri?: string | null;
  captcha?: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  access_expires: string;
  refresh_expires: string;
  instance_id?: string;
}

// --- 用户 ---

export type AvatarType = "default" | "gravatar" | "file";

export interface GroupResponse {
  id: string;
  name: string;
  share_enabled: boolean;
  web_dav_enabled: boolean;
  share_download: boolean;
  share_free: boolean;
  relocate: boolean;
  source_batch: number;
  select_node: boolean;
  advance_delete: boolean;
  archive_download: boolean;
  archive_task: boolean;
  webdav_proxy: boolean;
  aria2: boolean;
  redirected_source: boolean;
}

export interface UserResponse extends ResponseBase {
  id: string;
  email: string;
  nickname: string;
  avatar: AvatarType;
  created_at: string;
  anonymous: boolean;
  group: GroupResponse;
  scopes: string[];
  tags: (string | null)[];
}

export interface UserStorageResponse {
  used: number;
  free: number;
  total: number;
}

// --- 站点配置 ---

export interface AuthMethodConfig {
  provider: AuthProviderType;
  is_enabled: boolean;
}

export interface SiteConfigResponse {
  title: string;
  site_notice: string | null;
  logo_light: string | null;
  logo_dark: string | null;
  register_enabled: boolean;
  login_captcha: boolean;
  reg_captcha: boolean;
  forget_captcha: boolean;
  captcha_type: string;
  captcha_key: string | null;
  auth_methods: AuthMethodConfig[];
  password_required: boolean;
  footer_code: string | null;
  tos_url: string | null;
  privacy_url: string | null;
}

// --- 文件/目录 ---

export type EntryType = "file" | "folder" | "symlink";
export type PolicyType = "local" | "s3";

export interface EntryResponse {
  id: string;
  name: string;
  type: EntryType;
  size: number;
  mime_type: string | null;
  thumb: boolean;
  created_at: string;
  updated_at: string;
  source_enabled: boolean;
}

export interface PolicyResponse {
  id: string;
  name: string;
  type: PolicyType;
  max_size: number;
  file_type: string[] | null;
}

export interface DirectoryResponse {
  id: string;
  parent: string | null;
  objects: EntryResponse[];
  policy: PolicyResponse;
}

export interface DirectoryCreateRequest {
  parent_id: string;
  name: string;
  policy_id?: string | null;
}

export interface CreateFileRequest {
  name: string;
  parent_id: string;
  policy_id?: string | null;
}

export interface EntryUpdateRequest {
  name?: string | null;
}

export interface EntryDeleteRequest {
  ids: string[];
}

export interface EntryMoveRequest {
  src_ids: string[];
  dst_id: string;
}

export interface EntryCopyRequest {
  src_ids: string[];
  dst_id: string;
}

// --- 上传 ---

export interface CreateUploadSessionRequest {
  file_name: string;
  file_size: number;
  parent_id: string;
  policy_id?: string | null;
}

export interface UploadSessionResponse {
  id: string;
  file_name: string;
  file_size: number;
  chunk_size: number;
  total_chunks: number;
  uploaded_chunks: number;
  expires_at: string;
}

export interface UploadChunkResponse {
  uploaded_chunks: number;
  total_chunks: number;
  is_complete: boolean;
  object_id: string | null;
}

// --- 分享 ---

export interface MagicLinkRequest {
  email: string;
}
