import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";
import { userSettings, site } from "@/api";
import { applyThemeConfig } from "@/lib/theme-registry";
import type { ThemeConfigBase } from "@/api/types";

export function useRequireAuth() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const ensureAuthenticated = useAuthStore((s) => s.ensureAuthenticated);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    ensureAuthenticated().then((ok) => {
      if (!ok) navigate("/session", { replace: true });
      else setChecked(true);
    });
  }, [ensureAuthenticated, navigate, accessToken]);

  return checked;
}

export function useRequireGuest() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (accessToken) navigate("/home", { replace: true });
  }, [accessToken, navigate]);

  return !accessToken;
}

function applyConfig(config: ThemeConfigBase) {
  applyThemeConfig(config.base_color, config.theme_color, config.chart_color, config.radius);
}

export function useInitUser() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const fetchProfile = useUserStore((s) => s.fetchProfile);
  const fetchStorage = useUserStore((s) => s.fetchStorage);

  useEffect(() => {
    if (accessToken) {
      fetchProfile();
      fetchStorage();
      userSettings.get().then((s) => {
        if (s.theme_config) applyConfig(s.theme_config);
      }).catch(() => {});
    }
  }, [accessToken, fetchProfile, fetchStorage]);
}

export function useInitSiteTheme() {
  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (token) return;
    site.themes().then((res) => {
      const defaultPreset = res.themes.find((t) => t.is_default);
      if (defaultPreset) applyConfig(defaultPreset.config);
    }).catch(() => {});
  }, []);
}
