import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import { mockSiteConfigResponse } from "@/mocks/handlers";
import { useSiteConfigStore } from "./site-config";

beforeEach(() => {
  useSiteConfigStore.setState({ config: null, lastError: null });
});

describe("useSiteConfigStore", () => {
  it("fetches and sets config", async () => {
    await useSiteConfigStore.getState().fetch();
    const state = useSiteConfigStore.getState();

    expect(state.config).not.toBeNull();
    expect(state.config!.site_name).toBe(mockSiteConfigResponse.site_name);
    expect(state.lastError).toBeNull();
  });

  it("sets lastError on failure", async () => {
    server.use(
      http.get("/api/v1/site/config", () =>
        HttpResponse.json({ detail: "Error" }, { status: 500 }),
      ),
    );

    await useSiteConfigStore.getState().fetch();
    expect(useSiteConfigStore.getState().lastError).toBeTruthy();
  });
});
