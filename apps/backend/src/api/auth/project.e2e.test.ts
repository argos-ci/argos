import { PROJECT_TOKEN_PERMISSION_LIST } from "@argos/schemas/project-token";
import { invariant } from "@argos/util/invariant";
import type { Request } from "express";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import type { AuthPATPayload, AuthProjectPayload } from "@/auth/payload";
import type { Account, TeamUser } from "@/database/models";
import {
  Project,
  UserAccessToken,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";
import { formatTestId } from "@/util/test-id";

import { getBuild } from "../handlers/getBuild";
import { getProject } from "../handlers/getProject";
import { getTest } from "../handlers/getTest";
import { createTestHandlerApp } from "../test-util";
import {
  assertAuthAttributes,
  assertProjectAccess,
  getAuthPayloadFromExpressReq,
  getProjectForAuth,
  VIEW_PROJECT_ACCESS,
} from "./project";

const test = base.extend<{
  account: Account;
  project: Project;
  scopedPatToken: string;
  otherScopedPatToken: string;
  contributorToken: string;
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
    });
    await factory.createProjectToken({
      projects: [project],
      token: "project-token",
    });
    await use(project);
  },
  scopedPatToken: async ({ account }, use) => {
    await use(await createScopedPatToken(account, "member"));
  },
  otherScopedPatToken: async ({}, use) => {
    const otherAccount = await factory.TeamAccount.create({ slug: "other" });
    await use(await createScopedPatToken(otherAccount, "member"));
  },
  // A team contributor with no project-level access.
  contributorToken: async ({ account }, use) => {
    await use(await createScopedPatToken(account, "contributor"));
  },
});

/** A token scoped to `account`, held by a team user at `userLevel`. */
async function createScopedPatToken(
  account: Account,
  userLevel: TeamUser["userLevel"],
): Promise<string> {
  invariant(account.teamId);
  const user = await factory.User.create();
  await factory.UserAccount.create({ userId: user.id });
  await factory.TeamUser.create({
    teamId: account.teamId,
    userId: user.id,
    userLevel,
  });
  const token = UserAccessToken.generateToken();
  const userAccessToken = await factory.UserAccessToken.create({
    userId: user.id,
    token: hashToken(token),
  });
  await UserAccessTokenScope.query().insert({
    userAccessTokenId: userAccessToken.id,
    accountId: account.id,
  });
  return token;
}

/** A build numbered 1 and a test, and the read route of each resource kind. */
async function createReadPaths(project: Project) {
  const bucket = await factory.ScreenshotBucket.create({
    projectId: project.id,
  });
  await factory.Build.create({
    projectId: project.id,
    compareScreenshotBucketId: bucket.id,
    number: 1,
  });
  const testRow = await factory.Test.create({ projectId: project.id });
  const projectPath = `/projects/acme/${project.name}`;
  return {
    project: projectPath,
    build: `${projectPath}/builds/1`,
    test: `${projectPath}/tests/${formatTestId({ projectName: project.name, testId: testRow.id })}`,
  };
}

function createProjectPayload(
  projectId: string,
  sha: string | null = null,
): AuthProjectPayload {
  return {
    type: "project",
    projects: [Project.fromJson({ id: projectId }, { skipValidation: true })],
    permissions: PROJECT_TOKEN_PERMISSION_LIST,
    sha,
  };
}

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
      const auth = createProjectPayload("project-1");

      expect(() =>
        assertProjectAccess(auth, {
          projectId: "project-1",
          account: { slug: "acme" },
        }),
      ).not.toThrow();
    });

    test("rejects project tokens for another project", () => {
      const auth = createProjectPayload("project-1");

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

  describe("assertAuthAttributes", () => {
    const sha = "b6bf264029c03888b7fb7e6db7386f3b245b77b0";

    test("no-op when attributes is undefined", () => {
      const auth = createProjectPayload("p", sha);
      expect(() => assertAuthAttributes(auth, undefined)).not.toThrow();
    });

    test("no-op when token has no bound sha", () => {
      const auth = createProjectPayload("p");
      expect(() => assertAuthAttributes(auth, { sha })).not.toThrow();
    });

    test("no-op for non-project auth", () => {
      const auth = {
        type: "pat",
        scope: [{ slug: "acme" }],
      } as AuthPATPayload;
      expect(() => assertAuthAttributes(auth, { sha })).not.toThrow();
    });

    test("passes when token sha matches", () => {
      const auth = createProjectPayload("p", sha);
      expect(() => assertAuthAttributes(auth, { sha })).not.toThrow();
    });

    test("throws when token sha does not match", () => {
      const auth = createProjectPayload("p", sha);
      const error = captureSyncError(() =>
        assertAuthAttributes(auth, {
          sha: "0000000000000000000000000000000000000000",
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
        projects: [{ id: project.id }],
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
        statusCode: 401,
        message:
          'Invalid authorization header scheme "Basic", please use "Bearer"',
      });
    });
  });

  describe("getProjectForAuth", () => {
    test("returns the routed project for a project token", async ({
      project,
    }) => {
      const auth = await getAuthPayloadFromExpressReq(
        createRequest("Bearer project-token"),
      );
      await expect(
        getProjectForAuth(
          Promise.resolve(auth),
          {
            owner: "acme",
            project: "web",
          },
          VIEW_PROJECT_ACCESS,
        ),
      ).resolves.toMatchObject({ id: project.id, name: "web" });
    });

    test("returns the routed project for a scoped PAT", async ({
      project,
      scopedPatToken,
    }) => {
      const auth = await getAuthPayloadFromExpressReq(
        createRequest(`Bearer ${scopedPatToken}`),
      );
      await expect(
        getProjectForAuth(
          Promise.resolve(auth),
          {
            owner: "acme",
            project: "web",
          },
          VIEW_PROJECT_ACCESS,
        ),
      ).resolves.toMatchObject({ id: project.id, name: "web" });
    });

    test("rejects project tokens for another project route", async ({
      account,
      project: _project,
    }) => {
      await factory.Project.create({
        accountId: account.id,
        name: "docs",
      });

      const auth = await getAuthPayloadFromExpressReq(
        createRequest("Bearer project-token"),
      );
      await expect(
        getProjectForAuth(
          Promise.resolve(auth),
          {
            owner: "acme",
            project: "docs",
          },
          VIEW_PROJECT_ACCESS,
        ),
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    test("rejects PATs outside the requested account", async ({
      otherScopedPatToken,
    }) => {
      const auth = await getAuthPayloadFromExpressReq(
        createRequest(`Bearer ${otherScopedPatToken}`),
      );
      await expect(
        getProjectForAuth(
          Promise.resolve(auth),
          {
            owner: "acme",
            project: "web",
          },
          VIEW_PROJECT_ACCESS,
        ),
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    test("returns 404 when the account is authorized but the project does not exist", async ({
      scopedPatToken,
    }) => {
      const auth = await getAuthPayloadFromExpressReq(
        createRequest(`Bearer ${scopedPatToken}`),
      );
      await expect(
        getProjectForAuth(
          Promise.resolve(auth),
          {
            owner: "acme",
            project: "missing-project",
          },
          VIEW_PROJECT_ACCESS,
        ),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Not found",
      });
    });

    test("returns 401 before 404 when a project token targets a missing project route", async ({
      project: _project,
    }) => {
      const auth = await getAuthPayloadFromExpressReq(
        createRequest("Bearer project-token"),
      );
      await expect(
        getProjectForAuth(
          Promise.resolve(auth),
          {
            owner: "acme",
            project: "missing-project",
          },
          VIEW_PROJECT_ACCESS,
        ),
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  describe("project permissions on reads", () => {
    const app = createTestHandlerApp(getProject, getBuild, getTest);

    beforeAll(() => {
      z.globalRegistry.clear();
    });

    test.for(["project", "build", "test"] as const)(
      "403s a %s to a contributor without project access",
      async (resource, { project, contributorToken }) => {
        const paths = await createReadPaths(project);
        await request(app)
          .get(paths[resource])
          .set("Authorization", `Bearer ${contributorToken}`)
          .expect(403);
      },
    );

    test("keeps a public project readable without project access", async ({
      account,
      contributorToken,
    }) => {
      const project = await factory.Project.create({
        accountId: account.id,
        name: "docs",
        private: false,
      });
      const paths = await createReadPaths(project);

      for (const path of Object.values(paths)) {
        await request(app)
          .get(path)
          .set("Authorization", `Bearer ${contributorToken}`)
          .expect(200);
      }
    });
  });
});
