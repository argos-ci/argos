import { invariant } from "@argos/util/invariant";
import express from "express";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import {
  OAuthClient,
  OAuthGrant,
  OAuthGrantAccount,
  type Account,
  type Build,
  type Project,
  type ScreenshotBucket,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { getApiResourceUrl, getMcpResourceUrl } from "@/oauth/metadata";
import type { OAuthScope } from "@/oauth/scopes";
import { issueTokens } from "@/oauth/tokens";

import { openAPIRouter } from "../index";
import { createTestHandlerApp } from "../test-util";
import { getBuild } from "./getBuild";

const app = createTestHandlerApp(getBuild);

const test = base.extend<{
  account: Account;
  project: Project;
  buckets: { base: ScreenshotBucket; compare: ScreenshotBucket };
  build: Build;
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
      token: "the-awesome-token",
    });
    await use(project);
  },
  buckets: async ({ project }, use) => {
    const [baseBucket, compareBucket] =
      await factory.ScreenshotBucket.createMany(2, [
        {
          projectId: project.id,
          name: "base",
          branch: "main",
          commit: "a".repeat(40),
        },
        {
          projectId: project.id,
          name: "compare",
          branch: "feature/login",
          commit: "b".repeat(40),
        },
      ]);
    invariant(baseBucket);
    invariant(compareBucket);
    await use({ base: baseBucket, compare: compareBucket });
  },
  build: async ({ project, buckets }, use) => {
    const build = await factory.Build.create({
      projectId: project.id,
      baseScreenshotBucketId: buckets.base.id,
      compareScreenshotBucketId: buckets.compare.id,
      prHeadCommit: "c".repeat(40),
      stats: {
        failure: 0,
        added: 1,
        unchanged: 2,
        changed: 3,
        removed: 4,
        total: 10,
        retryFailure: 0,
        ignored: 0,
      },
      conclusion: "no-changes",
    });
    await use(build);
  },
});

describe("getBuild", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  describe("without a valid token", () => {
    test("returns 401 status code", async () => {
      await request(app)
        .get("/projects/acme/web/builds/1")
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.body.error).toBe(
            `Project not found in Argos. If the issue persists, verify your token. (token: "invalid-token").`,
          );
        })
        .expect(401);
    });
  });

  test("returns a build for a project token", async ({ build }) => {
    await request(app)
      .get(`/projects/acme/web/builds/${build.number}`)
      .set("Authorization", "Bearer the-awesome-token")
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          id: build.id,
          number: build.number,
          status: "no-changes",
          url: "http://localhost:3000/acme/web/builds/1",
          notification: {
            description: "3 changed, 1 added, 4 removed — no changes found",
            context: "argos",
            github: { state: "success" },
            gitlab: { state: "success" },
            url: "http://localhost:3000/acme/web/builds/1",
          },
          conclusion: "no-changes",
          metadata: null,
          base: {
            branch: "main",
            sha: "a".repeat(40),
          },
          head: {
            branch: "feature/login",
            sha: "c".repeat(40),
          },
          stats: {
            added: 1,
            changed: 3,
            failure: 0,
            ignored: 0,
            removed: 4,
            retryFailure: 0,
            total: 10,
            unchanged: 2,
          },
        });
      });
  });

  describe("with an OAuth access token", () => {
    // The full router: OAuth scope failures surface through the shared
    // `errorHandler`, unlike `createTestHandlerApp`'s bare fallback.
    const oauthApp = express();
    oauthApp.use(openAPIRouter);

    async function createOAuthAccessToken(
      account: Account,
      scopes: OAuthScope[],
      options?: { resource?: string },
    ) {
      const user = await factory.User.create();
      await factory.UserAccount.create({ userId: user.id });
      invariant(account.teamId);
      await factory.TeamUser.create({
        teamId: account.teamId,
        userId: user.id,
      });
      const client = await OAuthClient.query().insertAndFetch({
        clientId: "test-client",
        clientName: "Test Client",
        redirectUris: ["http://localhost/callback"],
        grantTypes: ["authorization_code", "refresh_token"],
        responseTypes: ["code"],
        tokenEndpointAuthMethod: "none",
        isFirstParty: false,
        verified: false,
      });
      const grant = await OAuthGrant.query().insertAndFetch({
        userId: user.id,
        oauthClientId: client.id,
        scopes,
        lastUsedAt: null,
        revokedAt: null,
      });
      await OAuthGrantAccount.query().insert({
        oauthGrantId: grant.id,
        accountId: account.id,
      });
      const tokens = await issueTokens({
        grantId: grant.id,
        scopes,
        resource: options?.resource ?? null,
      });
      return tokens.accessToken;
    }

    test("returns a build with the projects:read scope", async ({
      account,
      build,
    }) => {
      const token = await createOAuthAccessToken(account, ["projects:read"]);
      await request(oauthApp)
        .get(`/projects/acme/web/builds/${build.number}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(build.id);
        });
    });

    test("returns 403 without the projects:read scope", async ({
      account,
      build,
    }) => {
      const token = await createOAuthAccessToken(account, ["profile"]);
      await request(oauthApp)
        .get(`/projects/acme/web/builds/${build.number}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.error).toContain("Insufficient scope");
        });
    });

    test("accepts a token bound to the REST API resource", async ({
      account,
      build,
    }) => {
      const token = await createOAuthAccessToken(account, ["projects:read"], {
        resource: getApiResourceUrl(),
      });
      await request(oauthApp)
        .get(`/projects/acme/web/builds/${build.number}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    });

    test("rejects a token bound to the MCP resource (audience isolation)", async ({
      account,
      build,
    }) => {
      const token = await createOAuthAccessToken(account, ["projects:read"], {
        resource: getMcpResourceUrl(),
      });
      await request(oauthApp)
        .get(`/projects/acme/web/builds/${build.number}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(401)
        .expect((res) => {
          expect(res.body.error).toContain("not issued for this resource");
        });
    });
  });

  test("returns a build without base info and uses the compare bucket sha when prHeadCommit is null", async ({
    project,
  }) => {
    const compareScreenshotBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch: "release",
      commit: "d".repeat(40),
    });
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareScreenshotBucket.id,
      prHeadCommit: null,
      baseScreenshotBucketId: null,
    });

    await request(app)
      .get(`/projects/acme/web/builds/${build.number}`)
      .set("Authorization", "Bearer the-awesome-token")
      .expect((res) => {
        expect(res.body.base).toBeNull();
        expect(res.body.head).toEqual({
          branch: "release",
          sha: "d".repeat(40),
        });
      })
      .expect(200);
  });
});
