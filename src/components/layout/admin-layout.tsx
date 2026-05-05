import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbSeparator, BreadcrumbPage,
} from "@/components/ui/breadcrumb";
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

  const pathLabelMap: Record<string, string> = {
    "/admin/home": t("admin.home"),
    "/admin/settings/site": t("admin.site"),
    "/admin/settings/register": t("admin.register"),
    "/admin/settings/captcha": t("admin.captcha"),
    "/admin/settings/mail": t("admin.mail"),
    "/admin/settings/avatar": t("admin.avatar"),
    "/admin/settings/pwa": t("admin.pwa"),
    "/admin/settings/appearance": t("admin.appearance"),
    "/admin/settings/task": t("admin.taskSettings"),
    "/admin/settings/advanced": t("admin.advanced"),
    "/admin/fs/categories": t("admin.categories"),
    "/admin/fs/viewers": t("admin.viewers"),
    "/admin/policies": t("admin.policies"),
    "/admin/nodes": t("admin.nodes"),
    "/admin/groups": t("admin.groups"),
    "/admin/users": t("admin.users"),
    "/admin/files": t("admin.files"),
    "/admin/shares": t("admin.shares"),
    "/admin/tasks": t("admin.tasks"),
    "/admin/file_apps": t("admin.fileApps"),
  };

  const buildBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs: { label: string; path?: string }[] = [];

    // Direct match
    if (pathLabelMap[path]) {
      crumbs.push({ label: pathLabelMap[path] });
      return crumbs;
    }

    // Detail pages: /admin/users/:id, /admin/groups/:id
    if (path.startsWith("/admin/users/")) {
      crumbs.push({ label: pathLabelMap["/admin/users"], path: "/admin/users" });
      crumbs.push({ label: t("adminUser.editUser") });
    } else if (path.startsWith("/admin/groups/")) {
      crumbs.push({ label: pathLabelMap["/admin/groups"], path: "/admin/groups" });
      crumbs.push({ label: t("adminGroup.editGroup") });
    } else {
      // Fallback: use last segment
      const segment = path.split("/").filter(Boolean).pop() ?? "";
      crumbs.push({ label: segment });
    }
    return crumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

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
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link to="/admin/home" />}>
                    {t("admin.title")}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="contents">
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {crumb.path ? (
                        <BreadcrumbLink render={<Link to={crumb.path} />}>
                          {crumb.label}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </span>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
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
