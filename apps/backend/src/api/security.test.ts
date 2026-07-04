import type { Request } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthPATPayload, AuthProjectPayload } from "@/auth/payload";

import { getAuthPayloadFromExpressReq } from "./auth/project";
import {
  anyTokenAuth,
  authenticateRequest,
  noAuth,
  personalAccessTokenAuth,
  projectTokenAuth,
  securitySchemes,
} from "./security";

vi.mock("./auth/project", () => ({
  getAuthPayloadFromExpressReq: vi.fn(),
}));

const projectPayload = {
  type: "project",
  project: { id: "project-1" },
  sha: null,
} as AuthProjectPayload;

const patPayload = {
  type: "pat",
  account: { id: "account-1" },
  user: { id: "user-1" },
  scope: [],
} as unknown as AuthPATPayload;

const request = {} as Request;

const resolveAs = (payload: AuthProjectPayload | AuthPATPayload) =>
  vi.mocked(getAuthPayloadFromExpressReq).mockResolvedValue(payload);

beforeEach(() => {
  vi.mocked(getAuthPayloadFromExpressReq).mockReset();
});

describe("security definitions", () => {
  it("declares bearer schemes for both token kinds", () => {
    expect(securitySchemes.projectToken).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
    expect(securitySchemes.personalAccessToken).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
  });

  it("declares the expected requirement shapes", () => {
    expect(projectTokenAuth).toEqual([{ projectToken: [] }]);
    expect(personalAccessTokenAuth).toEqual([{ personalAccessToken: [] }]);
    expect(anyTokenAuth).toEqual([
      { projectToken: [] },
      { personalAccessToken: [] },
    ]);
    expect(noAuth).toEqual([]);
  });
});

describe("authenticateRequest", () => {
  it("returns null for a public endpoint without resolving a token", async () => {
    await expect(authenticateRequest(request, noAuth)).resolves.toBeNull();
    expect(getAuthPayloadFromExpressReq).not.toHaveBeenCalled();
  });

  it("returns the project payload for a project-token endpoint", async () => {
    resolveAs(projectPayload);
    await expect(authenticateRequest(request, projectTokenAuth)).resolves.toBe(
      projectPayload,
    );
  });

  it("returns the PAT payload for a personal-access-token endpoint", async () => {
    resolveAs(patPayload);
    await expect(
      authenticateRequest(request, personalAccessTokenAuth),
    ).resolves.toBe(patPayload);
  });

  it("rejects a personal access token on a project-token endpoint", async () => {
    resolveAs(patPayload);
    await expect(
      authenticateRequest(request, projectTokenAuth),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: expect.stringContaining("project token"),
    });
  });

  it("rejects a project token on a personal-access-token endpoint", async () => {
    resolveAs(projectPayload);
    await expect(
      authenticateRequest(request, personalAccessTokenAuth),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: expect.stringContaining("personal access token"),
    });
  });

  it("accepts either token kind on an any-token endpoint", async () => {
    resolveAs(patPayload);
    await expect(authenticateRequest(request, anyTokenAuth)).resolves.toBe(
      patPayload,
    );

    resolveAs(projectPayload);
    await expect(authenticateRequest(request, anyTokenAuth)).resolves.toBe(
      projectPayload,
    );
  });
});
