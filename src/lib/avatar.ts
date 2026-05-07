import md5 from "blueimp-md5";
import type { AvatarType } from "@/api";

const API_BASE = import.meta.env.VITE_API_URL || "";

export function getAvatarUrl(
  user: { id: string; email: string; avatar: AvatarType },
  gravatarServer: string,
  size = 128,
): string | null {
  switch (user.avatar) {
    case "file":
      return `${API_BASE}/api/v1/user/avatar/${user.id}`;
    case "gravatar": {
      const base = gravatarServer.replace(/\/+$/, "");
      const hash = md5(user.email.trim().toLowerCase());
      return `${base}/avatar/${hash}?s=${size}&d=identicon`;
    }
    default:
      return null;
  }
}
