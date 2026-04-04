import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import { concludeBuild } from "@/build/concludeBuild";
import type { Build, Project, ScreenshotBucket } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { finalizeBuilds } from "./finalizeBuilds";

const app = createTestHandlerApp(finalizeBuilds);
const test = base.extend<{
  project: Project;
  compareScreenshotBucket: ScreenshotBucket;
  build: Build;
}>({
  project: async ({}, use) => {
    await setupDatabase();
    const account = await factory.TeamAccount.create({
      slug: "awesome-team",
    });
    const project = await factory.Project.create({
      token: "the-awesome-token",
      accountId: account.id,
    });
    await use(project);
  },
  compareScreenshotBucket: async ({ project }, use) => {
    const compareScreenshotBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      complete: false,
    });
    await use(compareScreenshotBucket);
  },
  build: async ({ project, compareScreenshotBucket }, use) => {
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareScreenshotBucket.id,
      externalId: "123",
      totalBatch: -1,
    });
    await use(build);
  },
});

describe("finalizeBuilds", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  describe("without a valid token", () => {
    test("returns 401 status code", async () => {
      await request(app)
        .post(`/builds/finalize`)
        .set("Authorization", "Bearer invalid-token")
        .send({ parallelNonce: "123" })
        .expect((res) => {
          expect(res.body.error).toBe(
            `Project not found in Argos. If the issue persists, verify your token. (token: "invalid-token").`,
          );
        })
        .expect(401);
    });
  });

  describe("with a bucket already complete", () => {
    test("returns 200 with the finalized build", async ({
      build,
      compareScreenshotBucket,
    }) => {
      await compareScreenshotBucket.$query().patch({ complete: true });
      await concludeBuild({ build, notify: false });

      await request(app)
        .post(`/builds/finalize`)
        .set("Authorization", "Bearer the-awesome-token")
        .send({ parallelNonce: "123" })
        .expect((res) => {
          expect(res.body).toEqual({
            builds: [
              {
                id: build.id,
                number: 1,
                status: "no-changes",
                url: "http://localhost:3000/awesome-team/awesome-project/builds/1",
                notification: {
                  description: "Everything's good!",
                  context: "argos",
                  github: { state: "success" },
                  gitlab: { state: "success" },
                },
                conclusion: "no-changes",
                metadata: null,
                base: null,
                head: {
                  branch: "master",
                  sha: compareScreenshotBucket.commit,
                },
                stats: {
                  added: 0,
                  changed: 0,
                  failure: 0,
                  ignored: 0,
                  removed: 0,
                  retryFailure: 0,
                  total: 0,
                  unchanged: 0,
                },
              },
            ],
          });
        })
        .expect(200);
    });
  });

  describe("without matching builds", () => {
    test("returns 200 with an empty array", async ({ build }) => {
      await build.$query().patch({ totalBatch: null });

      await request(app)
        .post(`/builds/finalize`)
        .set("Authorization", "Bearer the-awesome-token")
        .send({ parallelNonce: "123" })
        .expect((res) => {
          expect(res.body.builds).toEqual([]);
        })
        .expect(200);
    });
  });

  describe("with a valid build", () => {
    test("returns 200 status code", async ({
      build,
      compareScreenshotBucket,
    }) => {
      await concludeBuild({ build, notify: false });
      const res = await request(app)
        .post(`/builds/finalize`)
        .set("Authorization", "Bearer the-awesome-token")
        .send({ parallelNonce: "123" });

      const freshBuild = await build
        .$query()
        .withGraphFetched("compareScreenshotBucket");
      invariant(freshBuild.compareScreenshotBucket);
      expect(freshBuild.compareScreenshotBucket.complete).toBe(true);

      expect(res.body).toEqual({
        builds: [
          {
            id: build.id,
            number: 1,
            status: "no-changes",
            url: "http://localhost:3000/awesome-team/awesome-project/builds/1",
            notification: {
              description: "Everything's good!",
              context: "argos",
              github: { state: "success" },
              gitlab: { state: "success" },
            },
            conclusion: "no-changes",
            metadata: null,
            base: null,
            head: {
              branch: "master",
              sha: compareScreenshotBucket.commit,
            },
            stats: {
              added: 0,
              changed: 0,
              failure: 0,
              ignored: 0,
              removed: 0,
              retryFailure: 0,
              total: 0,
              unchanged: 0,
            },
          },
        ],
      });
    });
  });
});
