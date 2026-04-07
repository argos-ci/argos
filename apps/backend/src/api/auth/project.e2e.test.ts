import { invariant } from "@argos/util/invariant";
import type { Request } from "express";
import { test as base, describe, expect } from "vitest";

import type { AuthPATPayload, AuthProjectPayload } from "@/auth/payload";
import type { Account, Project } from "@/database/models";
import { UserAccessToken, UserAccessTokenScope } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import {
  assertProjectAccess,
  getAuthPayloadFromExpressReq,
  getAuthProjectPayloadFromExpressReq,
  getProjectFromReqAndParams,
} from "./project";

const test = base.extend<{
  account: Account;
  project: Project;
  scopedPatToken: string;
  otherScopedPatToken: string;
}>({
  account: async ({}, use) => {
    await setupDatabase();
    const account = await factory.TeamAccount.create({ slug: "acme" });
    await use(account);
  },
  project: async ({ account }, use) => {
    const project = await factory.Project.create({
      accountId: account.id,
      name: "web",
      token: "project-token",
    });
    await use(project);
  },
  scopedPatToken: async ({ account }, use) => {
    invariant(account.teamId);

    const user = await factory.User.create();
    await factory.UserAccount.create({ userId: user.id });
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel: "member",
    });

    const token = UserAccessToken.generateToken();
    const userAccessToken = await UserAccessToken.query().insertAndFetch({
      name: "acme-scope-token",
      source: "user",
      userId: user.id,
      token: hashToken(token),
    });

    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: account.id,
    });

    await use(token);
  },
  otherScopedPatToken: async ({}, use) => {
    const user = await factory.User.create();
    await factory.UserAccount.create({ userId: user.id });
    const otherAccount = await factory.TeamAccount.create({ slug: "other" });
    invariant(otherAccount.teamId);
    await factory.TeamUser.create({
      teamId: otherAccount.teamId,
      userId: user.id,
      userLevel: "member",
    });

    const token = UserAccessToken.generateToken();
    const userAccessToken = await UserAccessToken.query().insertAndFetch({
      name: "other-scope-token",
      source: "user",
      userId: user.id,
      token: hashToken(token),
    });

    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: otherAccount.id,
    });

    await use(token);
  },
});

function createRequest(authHeader?: string): Request {
  return {
    get(name: string) {
      return name === "authorization" ? authHeader : undefined;
    },
  } as Request;
}

function captureSyncError(callback: () => void) {
  try {
    callback();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("api/auth/project", () => {
  describe("assertProjectAccess", () => {
    test("allows matching project tokens", () => {
      const auth = {
        type: "project",
        project: { id: "project-1" },
      } as AuthProjectPayload;

      expect(() =>
        assertProjectAccess(auth, {
          projectId: "project-1",
          account: { slug: "acme" },
        }),
      ).not.toThrow();
    });

    test("rejects project tokens for another project", () => {
      const auth = {
        type: "project",
        project: { id: "project-1" },
      } as AuthProjectPayload;

      const error = captureSyncError(() =>
        assertProjectAccess(auth, {
          projectId: "project-2",
          account: { slug: "acme" },
        }),
      );

      expect(error).toMatchObject({ statusCode: 401 });
    });

    test("allows PAT scopes matched by account slug", () => {
      const auth = {
        type: "pat",
        scope: [{ slug: "acme" }],
      } as AuthPATPayload;

      expect(() =>
        assertProjectAccess(auth, {
          projectId: "project-1",
          account: { slug: "acme" },
        }),
      ).not.toThrow();
    });

    test("allows PAT scopes matched by account id params", () => {
      const auth = {
        type: "pat",
        scope: [{ slug: "account-id" }],
      } as AuthPATPayload;

      expect(() =>
        assertProjectAccess(auth, {
          projectId: "project-1",
          account: { id: "account-id" },
        }),
      ).not.toThrow();
    });

    test("rejects PAT scopes outside the account", () => {
      const auth = {
        type: "pat",
        scope: [{ slug: "acme" }],
      } as AuthPATPayload;

      const error = captureSyncError(() =>
        assertProjectAccess(auth, {
          projectId: "project-1",
          account: { slug: "other" },
        }),
      );

      expect(error).toMatchObject({ statusCode: 401 });
    });
  });

  describe("getAuthPayloadFromExpressReq", () => {
    test("routes user access tokens to PAT auth", async ({
      scopedPatToken,
    }) => {
      await expect(
        getAuthPayloadFromExpressReq(createRequest(`Bearer ${scopedPatToken}`)),
      ).resolves.toMatchObject({
        type: "pat",
        scope: [{ slug: "acme" }],
      });
    });

    test("routes project tokens to project auth", async ({ project }) => {
      await expect(
        getAuthPayloadFromExpressReq(createRequest("Bearer project-token")),
      ).resolves.toMatchObject({
        type: "project",
        project: { id: project.id },
      });
    });

    test("rejects requests without an authorization header", async () => {
      await expect(
        getAuthPayloadFromExpressReq(createRequest()),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Authorization header is missing",
      });
    });

    test("rejects invalid authorization schemes", async () => {
      await expect(
        getAuthPayloadFromExpressReq(createRequest("Basic bearer-token")),
      ).rejects.toMatchObject({
        statusCode: 400,
        message:
          'Invalid authorization header scheme "Basic", please use "Bearer"',
      });
    });
  });

  describe("getAuthProjectPayloadFromExpressReq", () => {
    test("returns project auth payloads", async ({ project }) => {
      await expect(
        getAuthProjectPayloadFromExpressReq(
          createRequest("Bearer project-token"),
        ),
      ).resolves.toMatchObject({
        type: "project",
        project: { id: project.id },
      });
    });

    test("rejects user access tokens", async ({ scopedPatToken }) => {
      await expect(
        getAuthProjectPayloadFromExpressReq(
          createRequest(`Bearer ${scopedPatToken}`),
        ),
      ).rejects.toMatchObject({
        statusCode: 401,
        message:
          "This endpoint is not accessible with a user access token, only with a an Argos project token.",
      });
    });

    test("rejects invalid authorization schemes", async () => {
      await expect(
        getAuthProjectPayloadFromExpressReq(
          createRequest("Basic bearer-token"),
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        message:
          'Invalid authorization header scheme "Basic", please use "Bearer"',
      });
    });

    test("rejects requests without an authorization header", async () => {
      await expect(
        getAuthProjectPayloadFromExpressReq(createRequest()),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Authorization header is missing",
      });
    });
  });

  describe("getProjectFromReqAndParams", () => {
    test("returns the routed project for a project token", async ({
      project,
    }) => {
      await expect(
        getProjectFromReqAndParams(createRequest("Bearer project-token"), {
          owner: "acme",
          project: "web",
        }),
      ).resolves.toMatchObject({ id: project.id, name: "web" });
    });

    test("returns the routed project for a scoped PAT", async ({
      project,
      scopedPatToken,
    }) => {
      await expect(
        getProjectFromReqAndParams(createRequest(`Bearer ${scopedPatToken}`), {
          owner: "acme",
          project: "web",
        }),
      ).resolves.toMatchObject({ id: project.id, name: "web" });
    });

    test("rejects project tokens for another project route", async ({
      account,
    }) => {
      await factory.Project.create({
        accountId: account.id,
        name: "docs",
      });

      await expect(
        getProjectFromReqAndParams(createRequest("Bearer project-token"), {
          owner: "acme",
          project: "docs",
        }),
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    test("rejects PATs outside the requested account", async ({
      otherScopedPatToken,
    }) => {
      await expect(
        getProjectFromReqAndParams(
          createRequest(`Bearer ${otherScopedPatToken}`),
          {
            owner: "acme",
            project: "web",
          },
        ),
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    test("returns 404 when the account is authorized but the project does not exist", async ({
      scopedPatToken,
    }) => {
      await expect(
        getProjectFromReqAndParams(createRequest(`Bearer ${scopedPatToken}`), {
          owner: "acme",
          project: "missing-project",
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Not found",
      });
    });

    test("returns 401 before 404 when a project token targets a missing project route", async () => {
      await expect(
        getProjectFromReqAndParams(createRequest("Bearer project-token"), {
          owner: "acme",
          project: "missing-project",
        }),
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });
});
