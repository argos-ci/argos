import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type {
  Build,
  Project,
  ScreenshotBucket,
} from "@/database/models/index.js";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { createTestHandlerApp } from "../test-util";
import { finalizeBuild } from "./finalizeBuild";

const app = createTestHandlerApp(finalizeBuild);

describe("getAuthProject", () => {
  let project: Project;
  let compareScreenshotBucket: ScreenshotBucket;
  let build: Build;

  beforeEach(async () => {
    await setupDatabase();
    const account = await factory.TeamAccount.create({
      slug: "awesome-team",
    });
    project = await factory.Project.create({
      token: "the-awesome-token",
      accountId: account.id,
    });
    compareScreenshotBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
    });
    build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareScreenshotBucket.id,
    });
  });

  describe("without a valid token", () => {
    it("returns 401 status code", async () => {
      await request(app)
        .post(`/builds/${build.id}/finalize`)
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.body.error).toBe(
            `Project not found in Argos. If the issue persists, verify your token. (token: "invalid-token").`,
          );
        })
        .expect(401);
    });
  });

  describe("with a not found build", () => {
    it("returns 404 status code", async () => {
      await request(app)
        .post(`/builds/9999999/finalize`)
        .set("Authorization", "Bearer the-awesome-token")
        .expect((res) => {
          expect(res.body.error).toBe(`Build not found`);
        })
        .expect(404);
    });
  });

  describe("with a bucket already complete", () => {
    beforeEach(async () => {
      await compareScreenshotBucket.$query().patch({ complete: true });
    });

    it("returns 409 status code", async () => {
      await request(app)
        .post(`/builds/${build.id}/finalize`)
        .set("Authorization", "Bearer the-awesome-token")
        .expect((res) => {
          expect(res.body.error).toBe(`Build is already finalized`);
        })
        .expect(409);
    });
  });

  describe("with a build from another project", () => {
    beforeEach(async () => {
      const project = await factory.Project.create();
      await Promise.all([
        compareScreenshotBucket.$query().patch({ complete: false }),
        build.$query().patch({ projectId: project.id }),
      ]);
    });

    it("returns 403 status code", async () => {
      await request(app)
        .post(`/builds/${build.id}/finalize`)
        .set("Authorization", "Bearer the-awesome-token")
        .expect((res) => {
          expect(res.body.error).toBe(`Build does not belong to project`);
        })
        .expect(403);
    });
  });

  describe("with a build with total batches", () => {
    beforeEach(async () => {
      await Promise.all([
        compareScreenshotBucket.$query().patch({ complete: false }),
        build.$query().patch({ totalBatch: 2 }),
      ]);
    });

    it("returns 409 status code", async () => {
      await request(app)
        .post(`/builds/${build.id}/finalize`)
        .set("Authorization", "Bearer the-awesome-token")
        .expect((res) => {
          expect(res.body.error).toBe(
            `Cannot finalize a build that expects a total of batches (parallel.total)`,
          );
        })
        .expect(409);
    });
  });

  describe("with a valid build", () => {
    beforeEach(async () => {
      await compareScreenshotBucket.$query().patch({ complete: false });
    });

    it("returns 200 status code", async () => {
      await request(app)
        .post(`/builds/${build.id}/finalize`)
        .set("Authorization", "Bearer the-awesome-token")
        .expect(async (res) => {
          const freshBuild = await build
            .$query()
            .withGraphFetched("compareScreenshotBucket");
          invariant(freshBuild.compareScreenshotBucket);
          expect(freshBuild.compareScreenshotBucket.complete).toBe(true);

          expect(res.body).toEqual({
            build: {
              id: build.id,
              number: 1,
              status: "stable",
              url: "http://localhost:3000/awesome-team/awesome-project/builds/1",
              notification: {
                description: "Everything's good!",
                context: "argos",
                github: { state: "success" },
                gitlab: { state: "success" },
              },
            },
          });
        })
        .expect(200);
    });
  });
});
