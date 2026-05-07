import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ChevronsUpDown, LogOut, Settings, Moon, Sun, Monitor, Languages,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";
import { useTheme } from "@/hooks/use-theme";
import { setLocale } from "@/i18n";
import { useSiteConfigStore } from "@/stores/site-config";
import { getAvatarUrl } from "@/lib/avatar";

export function NavUser() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const logout = useAuthStore((s) => s.logout);
  const clear = useUserStore((s) => s.clear);
  const profile = useUserStore((s) => s.profile);
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);

  const handleLogout = () => {
    logout();
    clear();
    navigate("/session", { replace: true });
  };

  const siteConfig = useSiteConfigStore((s) => s.config);
  const nickname = profile?.nickname ?? "...";
  const email = profile?.email ?? "";
  const initials = nickname.slice(0, 2).toUpperCase();
  const avatarUrl = profile && siteConfig
    ? getAvatarUrl(profile, siteConfig.gravatar_server)
    : null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />}
          >
            <Avatar className="size-8 rounded-lg">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={nickname} />}
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{nickname}</span>
              <span className="truncate text-xs">{email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{nickname}</span>
                    <span className="truncate text-xs">{email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings />
                {t("nav.settings")}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {theme === "dark" ? <Moon /> : theme === "light" ? <Sun /> : <Monitor />}
                  {theme === "dark" ? t("theme.dark") : theme === "light" ? t("theme.light") : t("theme.system")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun />
                    {t("theme.light")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon />
                    {t("theme.dark")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Monitor />
                    {t("theme.system")}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Languages />
                  {i18n.language === "zh-CN" ? "简体中文" : i18n.language === "zh-TW" ? "繁體中文" : "English"}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setLocale("zh-CN")}>简体中文</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocale("en")}>English</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocale("zh-TW")}>繁體中文</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              {t("auth.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
