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
import AdminGroupsPage from "@/pages/admin/groups";
import AdminGroupDetailPage from "@/pages/admin/group-detail";
import AdminPoliciesPage from "@/pages/admin/policies";
import AdminPolicyDetailPage from "@/pages/admin/policy-detail";
import AdminUsersPage from "@/pages/admin/users";
import AdminUserDetailPage from "@/pages/admin/user-detail";

import SiteSettingsPage from "@/pages/admin/settings/site";
import RegisterSettingsPage from "@/pages/admin/settings/register";
import CaptchaSettingsPage from "@/pages/admin/settings/captcha";
import MailSettingsPage from "@/pages/admin/settings/mail";
import AvatarSettingsPage from "@/pages/admin/settings/avatar";
import PwaSettingsPage from "@/pages/admin/settings/pwa";
import AppearanceSettingsPage from "@/pages/admin/settings/appearance";
import TaskSettingsPage from "@/pages/admin/settings/task";
import AdvancedSettingsPage from "@/pages/admin/settings/advanced";

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
      { path: "/admin/settings/site", element: <SiteSettingsPage /> },
      { path: "/admin/settings/register", element: <RegisterSettingsPage /> },
      { path: "/admin/settings/captcha", element: <CaptchaSettingsPage /> },
      { path: "/admin/settings/mail", element: <MailSettingsPage /> },
      { path: "/admin/settings/avatar", element: <AvatarSettingsPage /> },
      { path: "/admin/settings/pwa", element: <PwaSettingsPage /> },
      { path: "/admin/settings/appearance", element: <AppearanceSettingsPage /> },
      { path: "/admin/settings/task", element: <TaskSettingsPage /> },
      { path: "/admin/settings/advanced", element: <AdvancedSettingsPage /> },
      { path: "/admin/fs/:section", element: <AdminPlaceholder /> },
      { path: "/admin/policies", element: <AdminPoliciesPage /> },
      { path: "/admin/policies/:policyId", element: <AdminPolicyDetailPage /> },
      { path: "/admin/nodes", element: <AdminPlaceholder /> },
      { path: "/admin/groups", element: <AdminGroupsPage /> },
      { path: "/admin/groups/:groupId", element: <AdminGroupDetailPage /> },
      { path: "/admin/users", element: <AdminUsersPage /> },
      { path: "/admin/users/:userId", element: <AdminUserDetailPage /> },
      { path: "/admin/files", element: <AdminPlaceholder /> },
      { path: "/admin/shares", element: <AdminPlaceholder /> },
      { path: "/admin/tasks", element: <AdminPlaceholder /> },
    ],
  },

  // 404
  { path: "*", element: <NotFoundPage /> },
]);
