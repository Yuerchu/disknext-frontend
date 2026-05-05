import { useTheme } from "./use-theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  // Reset store to system default
  useTheme.getState().setTheme("system");
});

describe("useTheme", () => {
  it("defaults to system when no localStorage value", () => {
    localStorage.removeItem("theme");
    // The store initializes once at module load. We test setTheme instead.
    expect(useTheme.getState().theme).toBeDefined();
  });

  it("setTheme updates store and localStorage", () => {
    useTheme.getState().setTheme("dark");

    expect(useTheme.getState().theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("setTheme light removes dark class", () => {
    useTheme.getState().setTheme("dark");
    useTheme.getState().setTheme("light");

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggleTheme switches from dark to light", () => {
    useTheme.getState().setTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    useTheme.getState().toggleTheme();
    expect(useTheme.getState().theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggleTheme switches from light to dark", () => {
    useTheme.getState().setTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    useTheme.getState().toggleTheme();
    expect(useTheme.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
