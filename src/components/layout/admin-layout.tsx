import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AdminSidebar } from "./admin-sidebar";
import { useRequireAuth } from "@/hooks/use-auth";
import { useUserStore } from "@/stores/user";

export function AdminLayout() {
  const ready = useRequireAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const isAdmin = useUserStore((s) => s.isAdmin);
  const profile = useUserStore((s) => s.profile);
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    if (!ready || !profile) return;
    if (!isAdmin) {
      navigate("/home", { replace: true });
    } else {
      setAdminChecked(true);
    }
  }, [ready, profile, isAdmin, navigate]);

  if (!ready || !adminChecked) return null;

  const segment = location.pathname.split("/").filter(Boolean).pop() ?? "home";

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AdminSidebar variant="inset" />
      <SidebarInset>
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
            <h1 className="text-base font-medium">{t("admin.title")} — <span className="capitalize">{segment}</span></h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <Outlet />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
