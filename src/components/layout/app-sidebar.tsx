import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router";
import {
  FolderOpen, Image, Video, Music, FileText, Share2, Trash2,
  HardDrive, Shield, Settings, Download, Globe,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { NavUser } from "./nav-user";
import { useUserStore } from "@/stores/user";
import { useAbility } from "@/lib/ability-context";

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  /** 需要的 scope resource（检查 read 权限），不填则始终显示 */
  scope?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const storage = useUserStore((s) => s.storage);
  const isAdmin = useUserStore((s) => s.isAdmin);
  const ability = useAbility();

  const navItems: NavItem[] = [
    { path: "/home", icon: FolderOpen, label: t("nav.myFiles"), scope: "files" },
    { path: "/category/image", icon: Image, label: t("nav.images"), scope: "files" },
    { path: "/category/video", icon: Video, label: t("nav.videos"), scope: "files" },
    { path: "/category/audio", icon: Music, label: t("nav.music"), scope: "files" },
    { path: "/category/document", icon: FileText, label: t("nav.documents"), scope: "files" },
  ];

  const otherItems: NavItem[] = [
    { path: "/shares", icon: Share2, label: t("nav.shares"), scope: "shares" },
    { path: "/trash", icon: Trash2, label: t("nav.trash"), scope: "files" },
    { path: "/mount", icon: HardDrive, label: t("nav.mount"), scope: "webdav" },
    { path: "/aria2", icon: Download, label: t("nav.aria2"), scope: "aria2" },
  ];

  const secondaryItems: NavItem[] = [
    { path: "/settings", icon: Settings, label: t("nav.settings") },
    ...(isAdmin ? [{ path: "/admin", icon: Shield, label: t("nav.admin") }] : []),
  ];

  const filterByScope = (items: NavItem[]) =>
    items.filter((item) => !item.scope || ability.can("read", item.scope));

  const usedPercent = storage ? (storage.used / storage.total) * 100 : 0;

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => navigate("/home")}
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Globe className="size-4" />
              </div>
              <span className="truncate font-semibold text-sm">DiskNext</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {filterByScope(navItems).map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname.startsWith(item.path)}
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

        {filterByScope(otherItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("common.more")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByScope(otherItems).map((item) => (
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
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname.startsWith(item.path)}
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
      </SidebarContent>

      <SidebarFooter>
        {storage && (
          <div className="px-2 pb-1">
            <Progress value={usedPercent} className="h-1.5" />
            <p className="mt-1 text-xs text-muted-foreground">
              {formatBytes(storage.used)} / {formatBytes(storage.total)}
            </p>
          </div>
        )}
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
