import { create } from "zustand";
import { syncThemeMode } from "@/lib/theme-registry";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  syncThemeMode();
}

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

export const useTheme = create<ThemeState>()((set, get) => {
  const stored = (localStorage.getItem("theme") as Theme) || "system";

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (get().theme === "system") applyTheme("system");
  });

  applyTheme(stored);

  return {
    theme: stored,
    setTheme: (t: Theme) => {
      localStorage.setItem("theme", t);
      applyTheme(t);
      set({ theme: t });
    },
    toggleTheme: () => {
      const dark = document.documentElement.classList.contains("dark");
      get().setTheme(dark ? "light" : "dark");
    },
  };
});
