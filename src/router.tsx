import { createBrowserRouter, Navigate } from "react-router";
import { UserLayout } from "@/components/layout/user-layout";
import { AdminLayout } from "@/components/layout/admin-layout";

import LandingPage from "@/pages/landing";
import SessionPage from "@/pages/session";
import ShareViewPage from "@/pages/share-view";
import NotFoundPage from "@/pages/not-found";

import HomePage from "@/pages/home";
import SettingsPage from "@/pages/settings";
import SharesPage from "@/pages/shares";
import CategoryPage from "@/pages/category";
import TrashPage from "@/pages/trash";
import MountPage from "@/pages/mount";

import AdminHomePage from "@/pages/admin/home";
import AdminPlaceholder from "@/pages/admin/placeholder";

export const router = createBrowserRouter([
  // Guest routes
  { path: "/", element: <LandingPage /> },
  { path: "/session", element: <SessionPage /> },
  { path: "/s/:code", element: <ShareViewPage /> },

  // Authenticated user routes
  {
    element: <UserLayout />,
    children: [
      { path: "/home/*", element: <HomePage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/shares", element: <SharesPage /> },
      { path: "/category/:category", element: <CategoryPage /> },
      { path: "/trash", element: <TrashPage /> },
      { path: "/mount", element: <MountPage /> },
    ],
  },

  // Admin routes
  {
    element: <AdminLayout />,
    children: [
      { path: "/admin", element: <Navigate to="/admin/home" replace /> },
      { path: "/admin/home", element: <AdminHomePage /> },
      { path: "/admin/settings/:section", element: <AdminPlaceholder /> },
      { path: "/admin/fs/:section", element: <AdminPlaceholder /> },
      { path: "/admin/policies", element: <AdminPlaceholder /> },
      { path: "/admin/nodes", element: <AdminPlaceholder /> },
      { path: "/admin/groups", element: <AdminPlaceholder /> },
      { path: "/admin/users", element: <AdminPlaceholder /> },
      { path: "/admin/files", element: <AdminPlaceholder /> },
      { path: "/admin/shares", element: <AdminPlaceholder /> },
      { path: "/admin/tasks", element: <AdminPlaceholder /> },
    ],
  },

  // 404
  { path: "*", element: <NotFoundPage /> },
]);
