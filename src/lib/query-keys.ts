export const queryKeys = {
  // File browsing
  directory: (path: string) => ["directory", path] as const,

  // Shares
  shares: (params: Record<string, unknown>) => ["shares", params] as const,

  // Trash
  trash: () => ["trash"] as const,

  // Admin
  adminSummary: () => ["admin", "summary"] as const,
  adminUsers: (params: Record<string, unknown>) => ["admin", "users", params] as const,
  adminUser: (id: string) => ["admin", "users", id] as const,
  adminGroups: (params?: Record<string, unknown>) => ["admin", "groups", params ?? {}] as const,
  adminGroup: (id: string) => ["admin", "group", id] as const,
  adminGroupMembers: (id: string, params: Record<string, unknown>) =>
    ["admin", "group", id, "members", params] as const,
  adminScopeMetadata: () => ["admin", "scope", "metadata"] as const,
  adminSettings: (section: string) => ["admin", "settings", section] as const,

  // User settings
  userSettings: () => ["user", "settings"] as const,
  userAuthns: () => ["user", "authns"] as const,
  userDefaultViewers: () => ["user", "defaultViewers"] as const,
} as const;
