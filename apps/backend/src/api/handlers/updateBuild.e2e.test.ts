import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect, vi } from "vitest";
import z from "zod";

import type { Build, Project, ScreenshotBucket } from "@/database/models";
import { Screenshot } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { updateBuild } from "./updateBuild";

vi.mock("@/build", () => ({
  job: { push: vi.fn(() => Promise.resolve()) },
}));

const app = createTestHandlerApp(updateBuild);

const test = base.extend<{
  project: Project;
  compareScreenshotBucket: ScreenshotBucket;
  build: Build;
}>({
  project: async ({}, use) => {
    await setupDatabase();
    const account = await factory.TeamAccount.create({ slug: "awesome-team" });
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
      name: "default",
      projectId: project.id,
      compareScreenshotBucketId: compareScreenshotBucket.id,
    });
    await use(build);
  },
});

/** Build a valid 64-char SHA256-like key from a single character. */
const key = (char: string) => char.repeat(64);

const screenshot = (name: string, keyChar: string) => ({
  key: key(keyChar),
  name,
  contentType: "image/png",
});

const put = (buildId: string, body: unknown) =>
  request(app)
    .put(`/builds/${buildId}`)
    .set("Authorization", "Bearer the-awesome-token")
    .send(body as object);

const countScreenshots = (bucketId: string) =>
  Screenshot.query().where("screenshotBucketId", bucketId).resultSize();

describe("updateBuild", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  describe("single build uploaded across multiple requests", () => {
    test("only finalizes on the final request", async ({
      build,
      compareScreenshotBucket,
    }) => {
      await put(build.id, {
        screenshots: [screenshot("a", "a")],
        final: false,
      }).expect(200);

      const partial = await build
        .$query()
        .withGraphFetched("compareScreenshotBucket");
      invariant(partial.compareScreenshotBucket);
      expect(partial.compareScreenshotBucket.complete).toBe(false);
      expect(await countScreenshots(compareScreenshotBucket.id)).toBe(1);

      await put(build.id, {
        screenshots: [screenshot("b", "b")],
        final: true,
      }).expect(200);

      const finalized = await build
        .$query()
        .withGraphFetched("compareScreenshotBucket");
      invariant(finalized.compareScreenshotBucket);
      expect(finalized.compareScreenshotBucket.complete).toBe(true);
      expect(finalized.compareScreenshotBucket.screenshotCount).toBe(2);
      expect(await countScreenshots(compareScreenshotBucket.id)).toBe(2);
    });

    test("finalizes immediately when `final` is omitted", async ({
      build,
      compareScreenshotBucket,
    }) => {
      await put(build.id, { screenshots: [screenshot("a", "a")] }).expect(200);

      const finalized = await build
        .$query()
        .withGraphFetched("compareScreenshotBucket");
      invariant(finalized.compareScreenshotBucket);
      expect(finalized.compareScreenshotBucket.complete).toBe(true);
      expect(await countScreenshots(compareScreenshotBucket.id)).toBe(1);
    });
  });

  describe("when a request is retried", () => {
    test("a non-final request is idempotent", async ({
      build,
      compareScreenshotBucket,
    }) => {
      const body = { screenshots: [screenshot("a", "a")], final: false };
      await put(build.id, body).expect(200);
      await put(build.id, body).expect(200);
      expect(await countScreenshots(compareScreenshotBucket.id)).toBe(1);
    });

    test("the finalizing request returns the build instead of 409", async ({
      build,
      compareScreenshotBucket,
    }) => {
      const body = { screenshots: [screenshot("a", "a")], final: true };
      await put(build.id, body).expect(200);
      await put(build.id, body).expect(200);
      expect(await countScreenshots(compareScreenshotBucket.id)).toBe(1);
    });
  });

  describe("when the build is already finalized", () => {
    test("adding new screenshots returns 409", async ({ build }) => {
      await put(build.id, {
        screenshots: [screenshot("a", "a")],
        final: true,
      }).expect(200);

      await put(build.id, {
        screenshots: [screenshot("b", "b")],
        final: true,
      })
        .expect(409)
        .expect((res) => {
          expect(res.body.error).toBe("Build is already finalized");
        });
    });
  });

  describe("when a name is uploaded with two different files", () => {
    test("rejects the conflicting screenshot", async ({
      build,
      compareScreenshotBucket,
    }) => {
      await put(build.id, {
        screenshots: [screenshot("a", "a")],
        final: false,
      }).expect(200);

      await put(build.id, {
        screenshots: [screenshot("a", "b")],
        final: true,
      }).expect(500);

      expect(await countScreenshots(compareScreenshotBucket.id)).toBe(1);
    });
  });
});
