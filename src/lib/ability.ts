import { createMongoAbility, type MongoAbility } from "@casl/ability";

/**
 * DiskNext scope 格式: "resource:action:visibility"
 *
 * resource:  files, shares, webdav, aria2,
 *            admin.users, admin.groups, admin.nodes, admin.settings,
 *            admin.policies, admin.files, admin.shares, admin.tasks,
 *            admin.file_apps, admin.themes, admin.dashboard
 * action:    create, read, write, delete, download, *
 * visibility: own, all
 *
 * 通配符规则:
 * - action=* 匹配该资源下所有操作
 * - visibility=all 包含 own
 */

type Actions = "create" | "read" | "write" | "delete" | "download" | "manage";
type Subjects = string;

export type AppAbility = MongoAbility<[Actions, Subjects]>;

/**
 * 从后端 scopes 字符串数组构建 CASL Ability
 */
export function buildAbility(scopes: string[]): AppAbility {
  const rules: { action: Actions | Actions[]; subject: string }[] = [];

  for (const scope of scopes) {
    const parts = scope.split(":");
    if (parts.length < 2) continue;

    const resource = parts[0]!;
    const action = parts[1]!;
    // visibility 暂时不影响前端 UI 控制（前端不区分 own/all，后端做最终校验）

    if (action === "*") {
      // 通配符：拥有该资源所有权限
      rules.push({ action: "manage", subject: resource });
    } else {
      rules.push({ action: action as Actions, subject: resource });
    }
  }

  return createMongoAbility<[Actions, Subjects]>(rules);
}

/**
 * 空权限（未登录或 scopes 为空时使用）
 */
export function emptyAbility(): AppAbility {
  return createMongoAbility<[Actions, Subjects]>([]);
}

/**
 * 快捷判断：是否拥有任意 admin.* 权限
 */
export function hasAnyAdminScope(scopes: string[]): boolean {
  return scopes.some((s) => s.startsWith("admin."));
}
