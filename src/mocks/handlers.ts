import { http, HttpResponse } from "msw";

const futureDate = (ms: number) => new Date(Date.now() + ms).toISOString();

export const mockTokenResponse = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  access_expires: futureDate(3600_000),
  refresh_expires: futureDate(86400_000),
  instance_id: "test-instance",
};

export const mockUserResponse = {
  id: "user-1",
  email: "test@example.com",
  nickname: "Test User",
  avatar: "default",
  avatar_type: "default",
  created_at: "2025-01-01T00:00:00Z",
  anonymous: false,
  group: {
    id: "g1",
    name: "Default",
    max_storage: 1073741824,
    admin: false,
    speed_limit: 0,
    scopes: ["files:*:own", "shares:*:own"],
  },
  scopes: [],
  tags: [],
};

export const mockStorageResponse = {
  used: 1024,
  free: 1073740800,
  total: 1073741824,
};

export const mockSiteConfigResponse = {
  site_name: "Test DiskNext",
  site_notice_public: null,
  logo_light: null,
  logo_dark: null,
  is_register_enabled: true,
  is_login_captcha: false,
  is_reg_captcha: false,
  is_forget_captcha: false,
  captcha_type: "default",
  captcha_recaptcha_key: null,
  captcha_cloudflare_key: null,
  auth_methods: [],
  is_auth_password_required: true,
  is_auth_phone_binding_required: false,
  is_auth_email_binding_required: true,
  avatar_size: 2097152,
  gravatar_server: "https://www.gravatar.com/",
  footer_code: null,
  tos_url: null,
  privacy_url: null,
};

export const handlers = [
  // Auth
  http.post("/api/v1/user/session/email", () =>
    HttpResponse.json(mockTokenResponse),
  ),
  http.post("/api/v1/user/session/refresh", () =>
    HttpResponse.json(mockTokenResponse),
  ),

  // User
  http.get("/api/v1/user/me", () =>
    HttpResponse.json(mockUserResponse),
  ),
  http.get("/api/v1/user/storage", () =>
    HttpResponse.json(mockStorageResponse),
  ),

  // Site
  http.get("/api/v1/site/config", () =>
    HttpResponse.json(mockSiteConfigResponse),
  ),
];
