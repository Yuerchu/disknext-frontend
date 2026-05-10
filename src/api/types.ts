// ==================== API 数据类型 ====================
// 严格对应后端 DTO

// --- 通用 ---

export interface ResponseBase {
  instance_id?: string;
}

// --- 认证 ---

export type AuthProviderType = "email_password" | "phone_sms" | "github" | "qq" | "passkey";

export interface EmailLoginRequest {
  email: string;
  password: string;
  two_fa_code?: string | null;
}

export interface PhoneSmsLoginRequest {
  phone: string;
  code: string;
}

export interface GithubLoginRequest {
  code: string;
}

export interface QQLoginRequest {
  code: string;
  redirect_uri: string;
}

export interface PasskeyLoginRequest {
  challenge_token: string;
  assertion: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
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
  max_storage: number;
  admin: boolean;
  speed_limit: number;
  scopes: string[];
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
  site_name: string;
  site_notice_public: string | null;
  logo_light: string | null;
  logo_dark: string | null;
  is_register_enabled: boolean;
  is_login_captcha: boolean;
  is_reg_captcha: boolean;
  is_forget_captcha: boolean;
  captcha_type: CaptchaType;
  captcha_recaptcha_key: string | null;
  captcha_cloudflare_key: string | null;
  auth_methods: AuthMethodConfig[];
  is_auth_password_required: boolean;
  is_auth_phone_binding_required: boolean;
  is_auth_email_binding_required: boolean;
  avatar_size: number;
  gravatar_server: string;
  footer_code: string | null;
  tos_url: string | null;
  privacy_url: string | null;
}

// --- Sudo 身份验证 ---

export type SudoMethod = "password" | "email_code" | "sms_code" | "totp";

export interface SudoCodeRequest {
  method: "email_code" | "sms_code";
}

export interface SudoRequest {
  method: SudoMethod;
  password?: string | null;
  code?: string | null;
}

export interface SudoResponse {
  sudo_token: string;
  expires_in: number;
}

// --- 修改邮箱/手机号 ---

export interface ChangeEmailCodeRequest {
  new_email: string;
}

export interface ChangeEmailRequest {
  new_email: string;
  new_email_code?: string | null;
}

export interface ChangePhoneCodeRequest {
  new_phone: string;
}

export interface ChangePhoneRequest {
  new_phone: string;
  new_phone_code?: string | null;
}

// --- 文件/目录 ---

export type EntryType = "file" | "folder" | "symlink";
export type PolicyType = "local" | "s3" | "cos" | "oss" | "onedrive" | "onedrive_cn" | "google_drive" | "upyun";

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
  upload_url: string | null;
}

export interface UploadChunkResponse {
  uploaded_chunks: number;
  total_chunks: number;
  is_complete: boolean;
  object_id: string | null;
}

// --- 回收站 ---

export interface TrashItemResponse {
  id: string;
  name: string;
  type: EntryType;
  size: number;
  deleted_at: string;
  original_parent_id: string | null;
}

export interface TrashDeleteRequest {
  ids?: string[];
  is_empty_all?: boolean;
}

export interface TrashRestoreRequest {
  ids: string[];
}

// --- 分享 ---

export interface ShareResponse {
  id: string;
  code: string;
  views: number;
  downloads: number;
  remain_downloads: number | null;
  expires: string | null;
  preview_enabled: boolean;
  score: number;
  has_password: boolean;
  created_at: string;
  file_id: string;
  is_expired: boolean;
}

export interface ShareListResponse {
  count: number;
  items: ShareResponse[];
}

export interface ShareCreateRequest {
  file_id: string;
  password?: string | null;
  expires?: string | null;
  remain_downloads?: number | null;
  preview_enabled?: boolean;
  score?: number;
}

export interface ShareCreateResponse extends ResponseBase {
  share_id: string;
}

export interface ShareListParams {
  expired?: boolean | null;
  offset?: number;
  limit?: number;
  desc?: boolean;
  order?: "created_at" | "updated_at";
}

// --- 管理员设置 ---

export type ViewMethod = "icon" | "list" | "smallIcon";
export type CaptchaType = "default" | "gcaptcha" | "cloudflare turnstile";
export type SmtpEncryption = "none" | "tls" | "starttls";
export type PwaDisplayMode = "standalone" | "fullscreen" | "minimal-ui" | "browser";

// 站点设置
export interface SiteSettingsResponse {
  site_url: string;
  site_name: string;
  site_title: string;
  site_keywords: string;
  site_description: string;
  site_notice_public: string | null;
  site_notice_user: string | null;
  footer_code: string | null;
  tos_url: string | null;
  privacy_url: string | null;
  logo_light: string | null;
  logo_dark: string | null;
  home_view_method: ViewMethod;
  share_view_method: ViewMethod;
  temp_path: string;
  avatar_path: string;
}

export type SiteSettingsUpdate = Partial<SiteSettingsResponse>;

// 注册与认证设置
export interface RegisterSettingsResponse {
  is_register_enabled: boolean;
  default_group_id: string | null;
  is_require_active: boolean;
  is_auth_email_password_enabled: boolean;
  is_auth_phone_sms_enabled: boolean;
  is_auth_passkey_enabled: boolean;
  is_auth_password_required: boolean;
  is_auth_phone_binding_required: boolean;
  is_auth_email_binding_required: boolean;
  default_admin_id: string | null;
  global_scopes: string[];
  sms_code_ttl_minutes: number;
  sms_code_rate_limit_seconds: number;
}

export type RegisterSettingsUpdate = Partial<RegisterSettingsResponse>;

// 验证码设置
export interface CaptchaSettingsResponse {
  is_login_captcha: boolean;
  is_reg_captcha: boolean;
  is_reg_email_captcha: boolean;
  is_forget_captcha: boolean;
  captcha_type: CaptchaType;
  captcha_height: number;
  captcha_width: number;
  captcha_mode: number;
  captcha_len: number;
  captcha_recaptcha_key: string | null;
  captcha_recaptcha_secret: string | null;
  captcha_cloudflare_key: string | null;
  captcha_cloudflare_secret: string | null;
  is_captcha_show_hollow_line: boolean;
  is_captcha_show_noise_dot: boolean;
  is_captcha_show_noise_text: boolean;
  is_captcha_show_slime_line: boolean;
  is_captcha_show_sine_line: boolean;
  captcha_complex_noise_text: number;
  captcha_complex_noise_dot: number;
  is_authn_enabled: boolean;
}

export type CaptchaSettingsUpdate = Partial<CaptchaSettingsResponse>;

// 邮件设置
export interface MailSettingsResponse {
  mail_from_name: string;
  mail_from_address: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string | null;
  smtp_encryption: SmtpEncryption;
  smtp_reply_to: string;
  mail_keepalive: number;
  mail_code_ttl_minutes: number;
}

export type MailSettingsUpdate = Partial<MailSettingsResponse>;

// 头像设置
export interface AvatarSettingsResponse {
  gravatar_server: string;
  avatar_size: number;
  avatar_quality: number;
}

export type AvatarSettingsUpdate = Partial<AvatarSettingsResponse>;

// PWA 设置
export interface PwaSettingsResponse {
  pwa_small_icon: string;
  pwa_medium_icon: string;
  pwa_large_icon: string;
  pwa_display: PwaDisplayMode;
  pwa_theme_color: string;
  pwa_background_color: string;
}

export type PwaSettingsUpdate = Partial<PwaSettingsResponse>;

// 外观设置
export interface AppearanceSettingsResponse {
  thumb_width: number;
  thumb_height: number;
  file_category_image: string;
  file_category_video: string;
  file_category_audio: string;
  file_category_document: string;
  hot_share_num: number;
  max_edit_size: number;
}

export type AppearanceSettingsUpdate = Partial<AppearanceSettingsResponse>;

// 任务设置
export interface TaskSettingsResponse {
  max_worker_num: number;
  max_parallel_transfer: number;
  cron_garbage_collect: string;
}

export type TaskSettingsUpdate = Partial<TaskSettingsResponse>;

// 高级设置
export interface AdvancedSettingsResponse {
  timeout_archive: number;
  timeout_download: number;
  timeout_preview: number;
  timeout_doc_preview: number;
  timeout_upload_credential: number;
  timeout_upload_session: number;
  timeout_slave_api: number;
  timeout_onedrive_monitor: number;
  timeout_share_download_session: number;
  timeout_onedrive_callback_check: number;
  timeout_aria2_call: number;
  timeout_onedrive_source: number;
  onedrive_chunk_retries: number;
  is_reset_after_upload_failed: boolean;
}

export type AdvancedSettingsUpdate = Partial<AdvancedSettingsResponse>;

// --- 管理员：通用分页 ---

export interface ListResponse<T> {
  count: number;
  items: T[];
}

export interface PaginationParams {
  offset?: number;
  limit?: number;
  order?: "created_at" | "updated_at";
  desc?: boolean;
}

// --- 管理员：用户组 ---

export type UserStatus = "active" | "admin_banned" | "system_banned";

export interface AdminGroupResponse {
  id: string;
  name: string;
  max_storage: number;
  admin: boolean;
  speed_limit: number;
  scopes: string[];
  user_count: number;
  policy_ids: string[];
}

export interface AdminGroupCreateRequest {
  name: string;
  max_storage?: number;
  admin?: boolean;
  speed_limit?: number;
  scopes?: string[];
  policy_ids?: string[];
}

export interface AdminGroupUpdateRequest {
  name?: string | null;
  max_storage?: number | null;
  admin?: boolean | null;
  speed_limit?: number | null;
  scopes?: string[] | null;
  policy_ids?: string[] | null;
}

// --- 管理员：用户 ---

export interface AdminUserResponse {
  email: string;
  id: string;
  nickname: string;
  storage: number;
  avatar: AvatarType;
  group_expires: string | null;
  group_id: string;
  group_name: string;
  scopes: string[];
  created_at: string;
  updated_at: string;
}

export interface AdminUserCreateRequest {
  email: string;
  password?: string | null;
  nickname: string;
  group_id: string;
}

export interface AdminUserUpdateRequest {
  email?: string | null;
  nickname?: string | null;
  phone?: string | null;
  group_id?: string | null;
  scopes?: string[] | null;
  status?: UserStatus | null;
  score?: number | null;
  storage?: number | null;
  group_expires?: string | null;
}

export interface AdminUserListParams extends PaginationParams {
  group_id?: string;
  email_contains?: string;
  nickname_contains?: string;
  status?: UserStatus;
}

// --- 管理员：权限元数据 ---

export interface ScopeEntry {
  value: string;
  action: string;
  visibility: string | null;
}

export interface ScopeResource {
  resource: string;
  parent: string | null;
  scopes: ScopeEntry[];
}

export interface ScopeMetadataResponse {
  resources: ScopeResource[];
  actions: string[];
  visibilities: string[];
}

export interface AdminCalibrateResponse {
  user_id: string;
  previous_storage: number;
  current_storage: number;
  difference: number;
  file_count: number;
}

// --- 管理员：概况 ---

export interface AdminMetricsSummary {
  dates: string[];
  files: number[];
  users: number[];
  shares: number[];
  file_total: number;
  user_total: number;
  share_total: number;
  entities_total: number;
  generated_at: string;
}

export interface AdminLicenseInfo {
  expired_at: string;
  signed_at: string;
  root_domains: string[];
  domains: string[];
  vol_domains: string[];
}

export interface AdminVersionInfo {
  version: string;
  pro: boolean;
  commit: string;
}

export interface AdminSummaryResponse {
  instance_id?: string;
  metrics_summary: AdminMetricsSummary;
  site_urls: string[];
  license: AdminLicenseInfo;
  version: AdminVersionInfo;
}

// --- 用户设置 ---

export type ThemeStyle = "vega" | "nova" | "maia" | "lyra" | "mira" | "luma" | "sera";
export type ThemeBaseColor = "neutral" | "stone" | "zinc" | "mauve" | "olive" | "mist" | "taupe";
export type ThemeColor = ThemeBaseColor | "amber" | "blue" | "cyan" | "emerald" | "fuchsia" | "green" | "indigo" | "lime" | "orange" | "pink" | "purple" | "red" | "rose" | "sky" | "teal" | "violet" | "yellow";
export type ThemeRadius = "default" | "none" | "small" | "medium" | "large";

export interface ThemeConfigBase {
  style: ThemeStyle;
  base_color: ThemeBaseColor;
  theme_color: ThemeColor;
  chart_color: ThemeColor;
  radius: ThemeRadius;
}

export interface ThemePresetResponse {
  id: string;
  name: string;
  is_default: boolean;
  config: ThemeConfigBase;
  created_at: string;
  updated_at: string;
}

export interface ThemePresetListResponse {
  themes: ThemePresetResponse[];
}

export interface ThemePresetCreateRequest {
  name: string;
  config: ThemeConfigBase;
}

export interface ThemePresetUpdateRequest {
  name?: string | null;
  config?: ThemeConfigBase | null;
}

export interface UserSettingResponse {
  id: string;
  email: string;
  nickname: string;
  created_at: string;
  group_name: string;
  language: string;
  timezone: number;
  group_expires: string | null;
  two_factor: boolean;
  phone: string | null;
  theme_preset_id: string | null;
  theme_config: ThemeConfigBase | null;
}

export interface UserSettingUpdateRequest {
  nickname?: string | null;
  language: string;
  timezone: number;
  theme_preset_id?: string | null;
  theme_config?: ThemeConfigBase | null;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface TwoFactorSetupResponse {
  setup_token: string;
  uri: string;
}

export interface TwoFactorEnableRequest {
  setup_token: string;
  code: string;
}

export interface AuthnDetailResponse {
  id: string;
  credential_id: string;
  name: string | null;
  credential_device_type: string;
  credential_backed_up: boolean;
  transports: string | null;
  created_at: string;
}

export interface AuthnRenameRequest {
  name: string;
}

export interface AuthnFinishRequest {
  credential: string;
  name?: string | null;
}

export interface FileAppSummary {
  id: string;
  name: string;
  app_key: string;
  type: "builtin" | "iframe" | "wopi";
  icon: string | null;
  description: string | null;
  iframe_url_template: string | null;
  wopi_editor_url_template: string | null;
}

export interface UserFileAppDefaultResponse {
  id: string;
  extension: string;
  app: FileAppSummary;
}

export interface SetDefaultViewerRequest {
  extension: string;
  app_id: string;
}

// --- 管理员：存储策略 ---

export interface AdminPolicySummary {
  id: string;
  name: string;
  policy_type: PolicyType;
  max_size: number;
  is_private: boolean;
}

// GET 详情返回（所有类型字段合并为可选）
export interface AdminPolicyDetail {
  id: string;
  name: string;
  policy_type: PolicyType;
  max_size: number;
  auto_rename: boolean;
  dir_name_rule: string | null;
  file_name_rule: string | null;
  is_private: boolean;
  base_url: string | null;
  is_origin_link_enable: boolean;
  token: string | null;
  file_type: string | null;
  mimetype: string | null;
  chunk_size: number;
  // local
  server?: string;
  // s3 / cos / oss
  bucket_name?: string;
  access_key?: string;
  secret_key?: string;
  s3_region?: string;
  s3_path_style?: boolean;
  // onedrive
  od_redirect?: string;
  client_id?: string;
  client_secret?: string;
  drive_id?: string;
  tenant_id?: string;
  // google_drive
  folder_id?: string;
  // upyun
  operator?: string;
  password?: string;
  domain?: string;
}

// 通用策略字段（各类型 create/update 的基础）
export interface AdminPolicyCommonRequest {
  name: string;
  max_size?: number;
  auto_rename?: boolean;
  dir_name_rule?: string | null;
  file_name_rule?: string | null;
  is_private?: boolean;
  base_url?: string | null;
  is_origin_link_enable?: boolean;
  token?: string | null;
  file_type?: string | null;
  mimetype?: string | null;
  chunk_size?: number;
}

export interface LocalPolicyCreateRequest extends AdminPolicyCommonRequest {
  server: string;
}

export interface S3PolicyCreateRequest extends AdminPolicyCommonRequest {
  server: string;
  bucket_name: string;
  access_key: string;
  secret_key: string;
  s3_region?: string;
  s3_path_style?: boolean;
}

export interface COSPolicyCreateRequest extends AdminPolicyCommonRequest {
  server: string;
  bucket_name: string;
  access_key: string;
  secret_key: string;
  s3_region?: string;
}

export interface OSSPolicyCreateRequest extends AdminPolicyCommonRequest {
  server: string;
  bucket_name: string;
  access_key: string;
  secret_key: string;
  s3_region?: string;
}

export interface OneDrivePolicyCreateRequest extends AdminPolicyCommonRequest {
  client_id: string;
  client_secret: string;
  server?: string | null;
  od_redirect?: string | null;
  drive_id?: string | null;
  tenant_id?: string | null;
}

export interface GoogleDrivePolicyCreateRequest extends AdminPolicyCommonRequest {
  client_id: string;
  client_secret: string;
  folder_id?: string | null;
}

export interface UpyunPolicyCreateRequest extends AdminPolicyCommonRequest {
  operator: string;
  password: string;
  bucket_name: string;
  domain?: string | null;
}

// 测试端点
export interface PolicyTestPathRequest {
  path: string;
}

export interface PathTestResponse {
  path: string;
  is_exists: boolean;
  is_writable: boolean;
}

export interface PolicyTestS3Request {
  server: string;
  bucket_name: string;
  access_key: string;
  secret_key: string;
  s3_region?: string;
  s3_path_style?: boolean;
}

export interface S3TestResponse {
  is_connected: boolean;
  message: string;
}

export interface PolicyTestSlaveRequest {
  server: string;
  secret: string;
}
