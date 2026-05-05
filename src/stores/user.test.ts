import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import { mockUserResponse, mockStorageResponse } from "@/mocks/handlers";
import { useUserStore } from "./user";

beforeEach(() => {
  useUserStore.getState().clear();
});

describe("useUserStore", () => {
  describe("fetchProfile", () => {
    it("fetches and sets profile", async () => {
      await useUserStore.getState().fetchProfile();
      const state = useUserStore.getState();

      expect(state.profile).not.toBeNull();
      expect(state.profile!.nickname).toBe(mockUserResponse.nickname);
      expect(state.lastError).toBeNull();
    });

    it("sets isAdmin from group.admin", async () => {
      server.use(
        http.get("/api/v1/user/me", () =>
          HttpResponse.json({ ...mockUserResponse, group: { ...mockUserResponse.group, admin: true } }),
        ),
      );

      await useUserStore.getState().fetchProfile();
      expect(useUserStore.getState().isAdmin).toBe(true);
    });

    it("sets lastError on failure", async () => {
      server.use(
        http.get("/api/v1/user/me", () =>
          HttpResponse.json({ detail: "Forbidden" }, { status: 403 }),
        ),
      );

      await useUserStore.getState().fetchProfile();
      expect(useUserStore.getState().lastError).toBeTruthy();
    });
  });

  describe("fetchStorage", () => {
    it("fetches and sets storage", async () => {
      await useUserStore.getState().fetchStorage();
      const state = useUserStore.getState();

      expect(state.storage).not.toBeNull();
      expect(state.storage!.total).toBe(mockStorageResponse.total);
    });

    it("sets lastError on failure", async () => {
      server.use(
        http.get("/api/v1/user/storage", () =>
          HttpResponse.json({ detail: "Error" }, { status: 500 }),
        ),
      );

      await useUserStore.getState().fetchStorage();
      expect(useUserStore.getState().lastError).toBeTruthy();
    });
  });

  describe("clear", () => {
    it("resets all state", async () => {
      await useUserStore.getState().fetchProfile();
      expect(useUserStore.getState().profile).not.toBeNull();

      useUserStore.getState().clear();
      const state = useUserStore.getState();

      expect(state.profile).toBeNull();
      expect(state.storage).toBeNull();
      expect(state.isAdmin).toBe(false);
      expect(state.lastError).toBeNull();
    });
  });
});
