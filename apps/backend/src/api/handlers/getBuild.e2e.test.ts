import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import z from "zod";

import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { getBuild } from "./getBuild";

const app = createTestHandlerApp(getBuild);

describe("getBuild", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  beforeEach(async () => {
    await setupDatabase();
  });

  describe("without a valid token", () => {
    it("returns 401 status code", async () => {
      await request(app)
        .get("/builds/non-existing-id")
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.body.error).toBe(
            `Project not found in Argos. If the issue persists, verify your token. (token: "invalid-token").`,
          );
        })
        .expect(401);
    });
  });

  describe("with a build from another project", () => {
    it("returns 404 status code", async () => {
      await factory.Project.create({ token: "valid-token" });
      const otherProject = await factory.Project.create();
      const compareScreenshotBucket = await factory.ScreenshotBucket.create({
        projectId: otherProject.id,
      });
      const foreignBuild = await factory.Build.create({
        projectId: otherProject.id,
        compareScreenshotBucketId: compareScreenshotBucket.id,
      });

      await request(app)
        .get(`/builds/${foreignBuild.id}`)
        .set("Authorization", "Bearer valid-token")
        .expect((res) => {
          expect(res.body.error).toBe("Not found");
        })
        .expect(404);
    });
  });

  describe("with a valid build", () => {
    it("returns the build", async () => {
      const account = await factory.TeamAccount.create({
        slug: "awesome-team",
      });
      const project = await factory.Project.create({
        accountId: account.id,
        name: "awesome-project",
        token: "the-awesome-token",
      });
      const compareScreenshotBucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
      });
      const build = await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: compareScreenshotBucket.id,
        metadata: null,
      });

      const res = await request(app)
        .get(`/builds/${build.id}`)
        .set("Authorization", "Bearer the-awesome-token")
        .expect(200);
      const url = await build.getUrl();
      expect(res.body).toMatchObject({
        id: build.id,
        number: build.number,
        status: "no-changes",
        conclusion: "no-changes",
        stats: {
          total: 0,
          failure: 0,
          changed: 0,
          added: 0,
          removed: 0,
          unchanged: 0,
          retryFailure: 0,
          ignored: 0,
        },
        metadata: null,
        url,
        notification: {
          description: "Everything's good!",
          context: "argos",
          github: { state: "success" },
          gitlab: { state: "success" },
        },
      });
    });
  });

  describe("with screenshot diffs containing a change", () => {
    it("returns a build with changes-detected status and stats", async () => {
      const account = await factory.TeamAccount.create({
        slug: "diffs-team",
      });
      const project = await factory.Project.create({
        accountId: account.id,
        name: "diffs-project",
        token: "token-with-diffs",
      });
      const baseScreenshotBucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
        name: "base",
      });
      const compareScreenshotBucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
        name: "compare",
      });
      const build = await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: compareScreenshotBucket.id,
        conclusion: "changes-detected",
        stats: {
          total: 1,
          changed: 1,
          added: 0,
          removed: 0,
          failure: 0,
          unchanged: 0,
          retryFailure: 0,
          ignored: 0,
        },
      });

      const baseScreenshot = await factory.Screenshot.create({
        screenshotBucketId: baseScreenshotBucket.id,
        name: "home.png",
      });
      const compareScreenshot = await factory.Screenshot.create({
        screenshotBucketId: compareScreenshotBucket.id,
        name: "home.png",
        baseName: "home.png",
      });

      await factory.ScreenshotDiff.create({
        buildId: build.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot.id,
        score: 0.42,
      });

      const res = await request(app)
        .get(`/builds/${build.id}`)
        .set("Authorization", "Bearer token-with-diffs")
        .expect(200);
      const url = await build.getUrl();
      expect(res.body).toMatchObject({
        id: build.id,
        status: "changes-detected",
        conclusion: "changes-detected",
        stats: {
          total: 1,
          changed: 1,
          added: 0,
          removed: 0,
          failure: 0,
          unchanged: 0,
          retryFailure: 0,
          ignored: 0,
        },
        url,
        notification: {
          description: "1 changed — waiting for your decision",
          context: "argos",
          github: { state: "failure" },
          gitlab: { state: "failed" },
        },
      });
    });
  });
});
