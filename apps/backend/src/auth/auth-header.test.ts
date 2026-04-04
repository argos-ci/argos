import { describe, expect, it, vi } from "vitest";

import {
  getAuthHeaderFromExpressReq,
  parseBearerFromHeader,
  safeParseBearerFromHeader,
} from "./auth-header";

describe("parseBearerFromHeader", () => {
  it("returns the bearer token", () => {
    expect(parseBearerFromHeader("Bearer secret-token")).toBe("secret-token");
  });

  it("throws on invalid header syntax", () => {
    expect.assertions(2);

    try {
      parseBearerFromHeader("");
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      expect("statusCode" in error ? error.statusCode : undefined).toBe(400);
      expect(error.message).toBe("Invalid authorization header");
    }
  });

  it("throws when the scheme is not Bearer", () => {
    expect.assertions(2);

    try {
      parseBearerFromHeader("Basic secret-token");
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      expect("statusCode" in error ? error.statusCode : undefined).toBe(400);
      expect(error.message).toBe(
        'Invalid authorization header scheme "Basic", please use "Bearer"',
      );
    }
  });

  it("throws when the bearer token is missing", () => {
    expect.assertions(2);

    try {
      parseBearerFromHeader("Bearer token extra");
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      expect("statusCode" in error ? error.statusCode : undefined).toBe(400);
      expect(error.message).toBe(
        "Invalid authorization header, no valid Bearer found",
      );
    }
  });
});

describe("safeParseBearerFromHeader", () => {
  it("returns the bearer token when the header is valid", () => {
    expect(safeParseBearerFromHeader("Bearer secret-token")).toBe(
      "secret-token",
    );
  });

  it("returns null when the header is invalid", () => {
    expect(safeParseBearerFromHeader("Basic secret-token")).toBeNull();
  });
});

describe("getAuthHeaderFromExpressReq", () => {
  it("returns the authorization header", () => {
    const request = {
      get: vi.fn().mockReturnValue("Bearer secret-token"),
    };

    expect(getAuthHeaderFromExpressReq(request as any)).toBe(
      "Bearer secret-token",
    );
    expect(request.get).toHaveBeenCalledWith("authorization");
  });

  it("throws when the authorization header is missing", () => {
    const request = {
      get: vi.fn().mockReturnValue(undefined),
    };

    expect.assertions(3);

    try {
      getAuthHeaderFromExpressReq(request as any);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      expect(request.get).toHaveBeenCalledWith("authorization");
      expect("statusCode" in error ? error.statusCode : undefined).toBe(401);
      expect(error.message).toBe("Authorization header is missing");
    }
  });
});
