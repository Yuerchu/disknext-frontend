import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";
import { useRequireAuth, useRequireGuest, useInitUser } from "./use-auth";

const mockMe = vi.fn().mockResolvedValue({
  id: "1", nickname: "Test", group: { admin: false, scopes: [] }, scopes: [], tags: [],
});
const mockStorage = vi.fn().mockResolvedValue({ used: 0, free: 1024, total: 1024 });

vi.mock("@/api", () => ({
  auth: { refresh: vi.fn() },
  user: {
    me: (...args: unknown[]) => mockMe(...args),
    storage: (...args: unknown[]) => mockStorage(...args),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

beforeEach(() => {
  useAuthStore.getState().logout();
  useUserStore.getState().clear();
  mockMe.mockClear();
  mockStorage.mockClear();
});

describe("useRequireAuth", () => {
  it("returns false when not authenticated", async () => {
    const { result } = renderHook(() => useRequireAuth(), { wrapper });
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("returns true when authenticated with valid token", async () => {
    useAuthStore.getState().setSession({
      access_token: "valid",
      refresh_token: "rt",
      access_expires: "2099-01-01T00:00:00Z",
      refresh_expires: "2099-01-01T00:00:00Z",
    });

    const { result } = renderHook(() => useRequireAuth(), { wrapper });
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});

describe("useRequireGuest", () => {
  it("returns true when not authenticated", () => {
    const { result } = renderHook(() => useRequireGuest(), { wrapper });
    expect(result.current).toBe(true);
  });

  it("returns false when authenticated", () => {
    useAuthStore.getState().setSession({
      access_token: "valid",
      refresh_token: "rt",
      access_expires: "2099-01-01T00:00:00Z",
      refresh_expires: "2099-01-01T00:00:00Z",
    });

    const { result } = renderHook(() => useRequireGuest(), { wrapper });
    expect(result.current).toBe(false);
  });
});

describe("useInitUser", () => {
  it("fetches profile and storage when authenticated", async () => {
    useAuthStore.getState().setSession({
      access_token: "valid",
      refresh_token: "rt",
      access_expires: "2099-01-01T00:00:00Z",
      refresh_expires: "2099-01-01T00:00:00Z",
    });

    renderHook(() => useInitUser(), { wrapper });

    await waitFor(() => {
      expect(mockMe).toHaveBeenCalled();
      expect(mockStorage).toHaveBeenCalled();
    });
  });

  it("does not fetch when not authenticated", () => {
    renderHook(() => useInitUser(), { wrapper });

    expect(mockMe).not.toHaveBeenCalled();
    expect(mockStorage).not.toHaveBeenCalled();
  });
});
