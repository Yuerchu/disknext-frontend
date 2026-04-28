import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router";
import {
  Home, Globe, ShieldCheck, Mail, Palette, FolderTree, Eye,
  Database, Server, Users, UserCog, File, Share2, ListTodo, ArrowLeft, AppWindow,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import { useAbility } from "@/lib/ability-context";

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  /** 需要的 scope resource（检查 read 权限） */
  scope?: string;
}

export function AdminSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const ability = useAbility();

  const settingsItems: NavItem[] = [
    { path: "/admin/settings/site", icon: Globe, label: t("admin.site"), scope: "admin.settings" },
    { path: "/admin/settings/session", icon: ShieldCheck, label: t("admin.session"), scope: "admin.settings" },
    { path: "/admin/settings/captcha", icon: ShieldCheck, label: t("admin.captcha"), scope: "admin.settings" },
    { path: "/admin/settings/mail", icon: Mail, label: t("admin.mail"), scope: "admin.settings" },
    { path: "/admin/settings/appearance", icon: Palette, label: t("admin.appearance"), scope: "admin.themes" },
  ];

  const fsItems: NavItem[] = [
    { path: "/admin/fs/categories", icon: FolderTree, label: t("admin.categories"), scope: "admin.settings" },
    { path: "/admin/fs/viewers", icon: Eye, label: t("admin.viewers"), scope: "admin.file_apps" },
  ];

  const managementItems: NavItem[] = [
    { path: "/admin/policies", icon: Database, label: t("admin.policies"), scope: "admin.policies" },
    { path: "/admin/nodes", icon: Server, label: t("admin.nodes"), scope: "admin.nodes" },
    { path: "/admin/groups", icon: Users, label: t("admin.groups"), scope: "admin.groups" },
    { path: "/admin/users", icon: UserCog, label: t("admin.users"), scope: "admin.users" },
    { path: "/admin/files", icon: File, label: t("admin.files"), scope: "admin.files" },
    { path: "/admin/shares", icon: Share2, label: t("admin.shares"), scope: "admin.shares" },
    { path: "/admin/tasks", icon: ListTodo, label: t("admin.tasks"), scope: "admin.tasks" },
    { path: "/admin/file_apps", icon: AppWindow, label: t("admin.fileApps"), scope: "admin.file_apps" },
  ];

  const filterByScope = (items: NavItem[]) =>
    items.filter((item) => !item.scope || ability.can("read", item.scope));

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => navigate("/admin/home")}
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <ShieldCheck className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{t("admin.title")}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {ability.can("read", "admin.dashboard") && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname === "/admin/home"}
                    onClick={() => navigate("/admin/home")}
                    tooltip={t("admin.home")}
                  >
                    <Home />
                    <span>{t("admin.home")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filterByScope(settingsItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("admin.settings")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByScope(settingsItems).map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.path}
                      onClick={() => navigate(item.path)}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filterByScope(fsItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("admin.filesystem")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByScope(fsItems).map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.path}
                      onClick={() => navigate(item.path)}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filterByScope(managementItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByScope(managementItems).map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.path}
                      onClick={() => navigate(item.path)}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/home")} tooltip={t("admin.backToHome")}>
                  <ArrowLeft />
                  <span>{t("admin.backToHome")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
