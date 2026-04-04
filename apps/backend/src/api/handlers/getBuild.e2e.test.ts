import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import type {
  Account,
  Build,
  Project,
  ScreenshotBucket,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

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
