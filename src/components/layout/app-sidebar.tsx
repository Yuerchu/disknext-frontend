import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router";
import {
  FolderOpen, Image, Video, Music, FileText, Share2, Trash2,
  HardDrive, Shield, Settings, Upload,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { NavUser } from "./nav-user";
import { useUserStore } from "@/stores/user";

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

  const navItems = [
    { path: "/home", icon: FolderOpen, label: t("nav.myFiles") },
    { path: "/category/image", icon: Image, label: t("nav.images") },
    { path: "/category/video", icon: Video, label: t("nav.videos") },
    { path: "/category/audio", icon: Music, label: t("nav.music") },
    { path: "/category/document", icon: FileText, label: t("nav.documents") },
  ];

  const otherItems = [
    { path: "/shares", icon: Share2, label: t("nav.shares") },
    { path: "/trash", icon: Trash2, label: t("nav.trash") },
    { path: "/mount", icon: HardDrive, label: t("nav.mount") },
  ];

  const secondaryItems = [
    { path: "/settings", icon: Settings, label: t("nav.settings") },
    ...(isAdmin ? [{ path: "/admin", icon: Shield, label: t("nav.admin") }] : []),
  ];

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
                <HardDrive className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">DiskNext</span>
                <span className="truncate text-xs text-muted-foreground">
                  {storage ? `${formatBytes(storage.used)} / ${formatBytes(storage.total)}` : "..."}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Upload button + main nav */}
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={t("common.upload")}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                >
                  <Upload />
                  <span>{t("common.upload")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarMenu>
              {navItems.map((item) => (
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

        {/* Other nav */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("common.more")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherItems.map((item) => (
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

        {/* Secondary nav (settings, admin) at bottom */}
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
