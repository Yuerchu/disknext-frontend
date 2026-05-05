import { renderHook, act, waitFor } from "@testing-library/react";
import { useSettings } from "./use-settings";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/api", () => ({
  resolveErrorMessage: (err: unknown) => err instanceof Error ? err.message : String(err),
}));

interface TestSettings {
  color: string;
  size: number;
}

function createMockApi(data: TestSettings) {
  return {
    get: vi.fn().mockResolvedValue(data),
    update: vi.fn().mockResolvedValue(undefined),
  };
}

describe("useSettings", () => {
  it("loads data on mount", async () => {
    const api = createMockApi({ color: "blue", size: 10 });
    const { result } = renderHook(() => useSettings(api, "Saved!"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ color: "blue", size: 10 });
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it("shows error toast on load failure", async () => {
    const { toast } = await import("sonner");
    const api = {
      get: vi.fn().mockRejectedValue(new Error("Load failed")),
      update: vi.fn(),
    };

    const { result } = renderHook(() => useSettings(api, "Saved!"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("Load failed");
  });

  it("saves data and shows success toast", async () => {
    const { toast } = await import("sonner");
    const api = createMockApi({ color: "blue", size: 10 });
    const { result } = renderHook(() => useSettings(api, "Saved!"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.save({ color: "red" });
    });

    expect(api.update).toHaveBeenCalledWith({ color: "red" });
    expect(result.current.data).toEqual({ color: "red", size: 10 });
    expect(toast.success).toHaveBeenCalledWith("Saved!");
  });

  it("shows error toast on save failure", async () => {
    const { toast } = await import("sonner");
    const api = {
      get: vi.fn().mockResolvedValue({ color: "blue", size: 10 }),
      update: vi.fn().mockRejectedValue(new Error("Save failed")),
    };
    const { result } = renderHook(() => useSettings(api, "Saved!"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.save({ color: "red" });
    });

    expect(toast.error).toHaveBeenCalledWith("Save failed");
  });

  it("optimistically updates a single key", async () => {
    const api = createMockApi({ color: "blue", size: 10 });
    const { result } = renderHook(() => useSettings<TestSettings>(api, "Saved!"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.update("color", "green");
    });

    expect(result.current.data).toEqual({ color: "green", size: 10 });
  });

  it("reload re-fetches data", async () => {
    const api = createMockApi({ color: "blue", size: 10 });
    const { result } = renderHook(() => useSettings(api, "Saved!"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    api.get.mockResolvedValueOnce({ color: "red", size: 20 });

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.data).toEqual({ color: "red", size: 20 });
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
