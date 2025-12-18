import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import z from "zod";

import { concludeBuild } from "@/build/concludeBuild";
import type { Build, Project, ScreenshotBucket } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { finalizeBuilds } from "./finalizeBuilds";

const app = createTestHandlerApp(finalizeBuilds);

describe("finalizeBuilds", () => {
  let project: Project;
  let compareScreenshotBucket: ScreenshotBucket;
  let build: Build;

  beforeAll(() => {
    z.globalRegistry.clear();
  });

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
      complete: false,
    });
    build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareScreenshotBucket.id,
      externalId: "123",
      totalBatch: -1,
    });
  });

  describe("without a valid token", () => {
    it("returns 401 status code", async () => {
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
    beforeEach(async () => {
      await compareScreenshotBucket.$query().patch({ complete: true });
      await concludeBuild({ build, notify: false });
    });

    it("returns 200 with the finalized build", async () => {
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
              },
            ],
          });
        })
        .expect(200);
    });
  });

  describe("without matching builds", () => {
    beforeEach(async () => {
      await build.$query().patch({ totalBatch: null });
    });

    it("returns 200 with an empty array", async () => {
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
    it("returns 200 status code", async () => {
      await concludeBuild({ build, notify: false });
      await request(app)
        .post(`/builds/finalize`)
        .set("Authorization", "Bearer the-awesome-token")
        .send({ parallelNonce: "123" })
        .expect(async (res) => {
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
              },
            ],
          });
        })
        .expect(200);
    });
  });
});
