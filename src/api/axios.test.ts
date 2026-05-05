import axios from "axios";
import { ApiError } from "./axios";

describe("ApiError", () => {
  describe("fromAxios", () => {
    it("extracts code and message from detail object", () => {
      vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { detail: { code: "user.not_found", message: "User not found" } },
        },
      };

      const err = ApiError.fromAxios(axiosError);
      expect(err.code).toBe("user.not_found");
      expect(err.message).toBe("User not found");
      expect(err.status).toBe(400);
    });

    it("handles string detail", () => {
      vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { detail: "Forbidden" },
        },
      };

      const err = ApiError.fromAxios(axiosError);
      expect(err.code).toBe("http.403");
      expect(err.message).toBe("Forbidden");
    });

    it("handles 422 validation array", () => {
      vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            detail: [
              { loc: ["body", "email"], msg: "invalid email", type: "value_error" },
            ],
          },
        },
      };

      const err = ApiError.fromAxios(axiosError);
      expect(err.code).toBe("validation.error");
      expect(err.message).toBe("invalid email");
    });

    it("handles response without detail", () => {
      vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

      const axiosError = {
        isAxiosError: true,
        response: { status: 500, data: {} },
      };

      const err = ApiError.fromAxios(axiosError);
      expect(err.code).toBe("http.500");
      expect(err.message).toBe("HTTP 500");
    });

    it("handles non-axios Error", () => {
      const err = ApiError.fromAxios(new Error("network failure"));
      expect(err.code).toBe("network");
      expect(err.message).toBe("network failure");
      expect(err.status).toBe(0);
    });

    it("handles unknown error type", () => {
      const err = ApiError.fromAxios("something broke");
      expect(err.code).toBe("unknown");
      expect(err.status).toBe(0);
    });
  });

  describe("is", () => {
    it("matches code", () => {
      const err = new ApiError(400, "user.not_found", "Not found");
      expect(err.is("user.not_found")).toBe(true);
      expect(err.is("other.code")).toBe(false);
    });
  });
});
