import { useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "./app-sidebar";
import { UploadPanel } from "@/components/upload/upload-panel";
import { useRequireAuth, useInitUser } from "@/hooks/use-auth";

export interface UserLayoutContext {
  headerSlot: HTMLDivElement | null;
}

function usePageTitle() {
  const { t } = useTranslation();
  const location = useLocation();

  const pathMap: Record<string, string> = {
    "/home": t("nav.myFiles"),
    "/settings": t("nav.settings"),
    "/shares": t("nav.shares"),
    "/trash": t("nav.trash"),
    "/mount": t("nav.mount"),
    "/category/image": t("nav.images"),
    "/category/video": t("nav.videos"),
    "/category/audio": t("nav.music"),
    "/category/document": t("nav.documents"),
  };

  return pathMap[location.pathname] ?? t("nav.myFiles");
}

export function UserLayout() {
  const ready = useRequireAuth();
  useInitUser();
  const title = usePageTitle();
  const location = useLocation();
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null);

  const isFileBrowser = location.pathname.startsWith("/home");

  if (!ready) return null;

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
            {isFileBrowser ? (
              <div ref={setHeaderSlot} className="flex flex-1 items-center justify-between gap-4" />
            ) : (
              <h1 className="text-base font-medium">{title}</h1>
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="flex flex-1 flex-col px-4 lg:px-6">
                <Outlet context={{ headerSlot } satisfies UserLayoutContext} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
      <UploadPanel />
    </SidebarProvider>
  );
}
