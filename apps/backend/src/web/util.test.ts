import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import config from "@/config";

import { subdomain } from "./util";

function createMockReq(
  overrides: Partial<{
    subdomains: string[];
    hostname: string;
    headers: Record<string, string>;
  }> = {},
) {
  return {
    subdomains: [],
    hostname: "example.com",
    headers: {},
    ...overrides,
  } as unknown as Request;
}

describe("subdomain", () => {
  it("calls handler when subdomain matches via req.subdomains", () => {
    const handler = vi.fn();
    const next = vi.fn();
    const middleware = subdomain(handler, "app");
    const req = createMockReq({ subdomains: ["app"] });

    middleware(req, {} as Response, next);

    expect(handler).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("calls handler when subdomain matches via host header", () => {
    const handler = vi.fn();
    const next = vi.fn();
    const middleware = subdomain(handler, "app");
    const req = createMockReq({
      headers: { host: "app.argos-ci.com" },
    });

    middleware(req, {} as Response, next);

    expect(handler).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when subdomain does not match", () => {
    const handler = vi.fn();
    const next = vi.fn();
    const middleware = subdomain(handler, "app");
    const req = createMockReq({
      headers: { host: "api.argos-ci.com" },
    });

    middleware(req, {} as Response, next);

    expect(handler).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("calls handler when selfHosted is true regardless of subdomain", () => {
    vi.spyOn(config, "get").mockImplementation((key: string) => {
      if (key === "selfHosted") return true;
      if (key === "env") return "production";
      return undefined;
    });

    const handler = vi.fn();
    const next = vi.fn();
    const middleware = subdomain(handler, "app");
    const req = createMockReq({
      headers: { host: "argos.company.com" },
    });

    middleware(req, {} as Response, next);

    expect(handler).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
