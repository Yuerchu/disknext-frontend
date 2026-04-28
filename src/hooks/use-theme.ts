import { create } from "zustand";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

export const useTheme = create<ThemeState>()((set, get) => {
  const stored = (localStorage.getItem("theme") as Theme) || "system";

  // 监听系统主题变化
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (get().theme === "system") applyTheme("system");
  });

  // 初始化时立即应用（兜底，index.html 的 script 已经处理了首次）
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
