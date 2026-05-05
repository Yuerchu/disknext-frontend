import { useAuthStore } from "./auth";

const mockRefresh = vi.fn();

vi.mock("@/api", () => ({
  auth: {
    refresh: (...args: unknown[]) => mockRefresh(...args),
  },
}));

function setSession(overrides: Record<string, string> = {}) {
  useAuthStore.getState().setSession({
    access_token: "at",
    refresh_token: "rt",
    access_expires: "2099-01-01T00:00:00Z",
    refresh_expires: "2099-01-01T00:00:00Z",
    ...overrides,
  });
}

const newTokenResponse = {
  access_token: "new-at",
  refresh_token: "new-rt",
  access_expires: "2099-01-01T00:00:00Z",
  refresh_expires: "2099-01-01T00:00:00Z",
};

beforeEach(() => {
  useAuthStore.getState().logout();
  mockRefresh.mockReset();
});

describe("useAuthStore", () => {
  describe("isAuthenticated", () => {
    it("returns false when no token", () => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });

    it("returns true after setSession", () => {
      setSession();
      expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    });
  });

  describe("isAccessExpired", () => {
    it("returns true when accessExpires is empty", () => {
      expect(useAuthStore.getState().isAccessExpired()).toBe(true);
    });

    it("returns true for past date", () => {
      setSession({ access_expires: "2000-01-01T00:00:00Z" });
      expect(useAuthStore.getState().isAccessExpired()).toBe(true);
    });

    it("returns false for future date", () => {
      setSession();
      expect(useAuthStore.getState().isAccessExpired()).toBe(false);
    });
  });

  describe("isRefreshExpired", () => {
    it("returns true when refreshExpires is empty", () => {
      expect(useAuthStore.getState().isRefreshExpired()).toBe(true);
    });

    it("returns true for past date", () => {
      setSession({ refresh_expires: "2000-01-01T00:00:00Z" });
      expect(useAuthStore.getState().isRefreshExpired()).toBe(true);
    });

    it("returns false for future date", () => {
      setSession();
      expect(useAuthStore.getState().isRefreshExpired()).toBe(false);
    });
  });

  describe("setSession", () => {
    it("populates all fields", () => {
      setSession();
      const state = useAuthStore.getState();
      expect(state.accessToken).toBe("at");
      expect(state.refreshToken).toBe("rt");
    });

    it("preserves instanceId if not provided", () => {
      useAuthStore.getState().setSession({
        access_token: "a1",
        refresh_token: "r1",
        access_expires: "2099-01-01T00:00:00Z",
        refresh_expires: "2099-01-01T00:00:00Z",
        instance_id: "inst-1",
      });
      useAuthStore.getState().setSession({
        access_token: "a2",
        refresh_token: "r2",
        access_expires: "2099-01-01T00:00:00Z",
        refresh_expires: "2099-01-01T00:00:00Z",
      });
      expect(useAuthStore.getState().instanceId).toBe("inst-1");
    });
  });

  describe("logout", () => {
    it("clears all tokens", () => {
      setSession();
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
      expect(useAuthStore.getState().accessToken).toBe("");
      expect(useAuthStore.getState().refreshToken).toBe("");
    });
  });

  describe("refresh", () => {
    it("calls API and updates session on success", async () => {
      mockRefresh.mockResolvedValueOnce(newTokenResponse);

      setSession();
      const result = await useAuthStore.getState().refresh();

      expect(result).toBe(true);
      expect(useAuthStore.getState().accessToken).toBe("new-at");
    });

    it("deduplicates concurrent calls", async () => {
      // Use a manually controlled promise to ensure the IIFE stays pending
      let resolveRefresh!: (value: unknown) => void;
      mockRefresh.mockImplementation(
        () => new Promise((resolve) => { resolveRefresh = resolve; }),
      );

      setSession();
      const p1 = useAuthStore.getState().refresh();
      const p2 = useAuthStore.getState().refresh();

      resolveRefresh(newTokenResponse);

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe(true);
      expect(r2).toBe(true);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it("returns false and logs out on failure", async () => {
      mockRefresh.mockRejectedValueOnce(new Error("fail"));

      setSession();
      const result = await useAuthStore.getState().refresh();

      expect(result).toBe(false);
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });

    it("returns false when no refresh token", async () => {
      const result = await useAuthStore.getState().refresh();
      expect(result).toBe(false);
    });
  });

  describe("ensureAuthenticated", () => {
    it("returns false when not authenticated", async () => {
      expect(await useAuthStore.getState().ensureAuthenticated()).toBe(false);
    });

    it("returns true when token is still valid", async () => {
      setSession();
      expect(await useAuthStore.getState().ensureAuthenticated()).toBe(true);
    });

    it("refreshes when access expired but refresh valid", async () => {
      mockRefresh.mockResolvedValueOnce(newTokenResponse);

      setSession({ access_expires: "2000-01-01T00:00:00Z" });
      const result = await useAuthStore.getState().ensureAuthenticated();

      expect(result).toBe(true);
      expect(useAuthStore.getState().accessToken).toBe("new-at");
    });

    it("logs out when both tokens expired", async () => {
      setSession({
        access_expires: "2000-01-01T00:00:00Z",
        refresh_expires: "2000-01-01T00:00:00Z",
      });
      const result = await useAuthStore.getState().ensureAuthenticated();

      expect(result).toBe(false);
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });
  });
});
