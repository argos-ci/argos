import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect, vi } from "vitest";
import z from "zod";

import type { Build, Project, ScreenshotBucket } from "@/database/models";
import { BuildShard, Screenshot } from "@/database/models";
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
    const names = (bucketId: string) =>
      Screenshot.query()
        .where("screenshotBucketId", bucketId)
        .orderBy("name")
        .then((screenshots) => screenshots.map((s) => s.name));

    test("keeps the conflicting screenshot under an indexed name", async ({
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
      }).expect(200);

      expect(await names(compareScreenshotBucket.id)).toEqual(["a", "a-1"]);
    });

    test("indexes duplicates within a single request", async ({
      build,
      compareScreenshotBucket,
    }) => {
      await put(build.id, {
        screenshots: [
          screenshot("a", "a"),
          screenshot("a", "b"),
          screenshot("a", "c"),
        ],
        final: true,
      }).expect(200);

      expect(await names(compareScreenshotBucket.id)).toEqual([
        "a",
        "a-1",
        "a-2",
      ]);
    });

    test("stays idempotent when a renamed screenshot is retried", async ({
      build,
      compareScreenshotBucket,
    }) => {
      await put(build.id, {
        screenshots: [screenshot("a", "a")],
        final: false,
      }).expect(200);

      const conflicting = { screenshots: [screenshot("a", "b")], final: false };
      await put(build.id, conflicting).expect(200);
      await put(build.id, conflicting).expect(200);

      expect(await names(compareScreenshotBucket.id)).toEqual(["a", "a-1"]);
    });

    test("keeps identical content uploaded under different names", async ({
      build,
      compareScreenshotBucket,
    }) => {
      await put(build.id, {
        screenshots: [screenshot("a", "a"), screenshot("b", "a")],
        final: true,
      }).expect(200);

      expect(await names(compareScreenshotBucket.id)).toEqual(["a", "b"]);
    });
  });

  describe("parallel build", () => {
    const parallelTest = test.extend<{ build: Build }>({
      build: async ({ project, compareScreenshotBucket }, use) => {
        const build = await factory.Build.create({
          name: "default",
          projectId: project.id,
          compareScreenshotBucketId: compareScreenshotBucket.id,
          batchCount: 0,
        });
        await use(build);
      },
    });

    const countShards = (buildId: string) =>
      BuildShard.query().where("buildId", buildId).resultSize();

    parallelTest(
      "finalizes once every shard has been received",
      async ({ build }) => {
        await put(build.id, {
          parallel: true,
          parallelTotal: 2,
          parallelIndex: 1,
          screenshots: [screenshot("a", "a")],
        }).expect(200);

        const partial = await build
          .$query()
          .withGraphFetched("compareScreenshotBucket");
        invariant(partial.compareScreenshotBucket);
        expect(partial.compareScreenshotBucket.complete).toBe(false);

        await put(build.id, {
          parallel: true,
          parallelTotal: 2,
          parallelIndex: 2,
          screenshots: [screenshot("b", "b")],
        }).expect(200);

        const finalized = await build
          .$query()
          .withGraphFetched("compareScreenshotBucket");
        invariant(finalized.compareScreenshotBucket);
        expect(finalized.compareScreenshotBucket.complete).toBe(true);
        expect(finalized.batchCount).toBe(2);
        expect(await countShards(build.id)).toBe(2);
      },
    );

    parallelTest(
      "counts a shard split across requests as a single batch",
      async ({ build, compareScreenshotBucket }) => {
        const shard1 = {
          parallel: true as const,
          parallelTotal: 2,
          parallelIndex: 1,
        };

        // First chunk of shard 1.
        await put(build.id, {
          ...shard1,
          screenshots: [screenshot("a", "a")],
          final: false,
        }).expect(200);

        let current = await build
          .$query()
          .withGraphFetched("compareScreenshotBucket");
        invariant(current.compareScreenshotBucket);
        expect(current.compareScreenshotBucket.complete).toBe(false);
        // The shard exists but isn't counted yet.
        expect(current.batchCount).toBe(0);
        expect(await countShards(build.id)).toBe(1);

        // Final chunk of shard 1: the shard is now counted, but the build still
        // waits for shard 2.
        await put(build.id, {
          ...shard1,
          screenshots: [screenshot("b", "b")],
          final: true,
        }).expect(200);

        current = await build
          .$query()
          .withGraphFetched("compareScreenshotBucket");
        invariant(current.compareScreenshotBucket);
        expect(current.compareScreenshotBucket.complete).toBe(false);
        expect(current.batchCount).toBe(1);
        expect(await countShards(build.id)).toBe(1);

        // Shard 2 in a single request finalizes the build.
        await put(build.id, {
          parallel: true,
          parallelTotal: 2,
          parallelIndex: 2,
          screenshots: [screenshot("c", "c")],
        }).expect(200);

        const finalized = await build
          .$query()
          .withGraphFetched("compareScreenshotBucket");
        invariant(finalized.compareScreenshotBucket);
        expect(finalized.compareScreenshotBucket.complete).toBe(true);
        // Two shards (3 requests), three screenshots.
        expect(finalized.batchCount).toBe(2);
        expect(await countShards(build.id)).toBe(2);
        expect(finalized.compareScreenshotBucket.screenshotCount).toBe(3);
        expect(await countScreenshots(compareScreenshotBucket.id)).toBe(3);
      },
    );

    parallelTest(
      "does not double-count a retried finalizing shard request",
      async ({ build }) => {
        const finalChunk = {
          parallel: true as const,
          parallelTotal: 2,
          parallelIndex: 1,
          screenshots: [screenshot("a", "a")],
          final: true,
        };
        await put(build.id, finalChunk).expect(200);
        // Retry of the same finalizing request.
        await put(build.id, finalChunk).expect(200);

        const current = await build.$query();
        expect(current.batchCount).toBe(1);
        expect(await countShards(build.id)).toBe(1);
      },
    );

    parallelTest(
      "returns the build when the finalizing request is retried (no request id)",
      async ({ build }) => {
        const onlyShard = {
          parallel: true as const,
          parallelTotal: 1,
          parallelIndex: 1,
          screenshots: [screenshot("a", "a")],
        };
        // Finalizes the build (1 of 1 shard).
        await put(build.id, onlyShard).expect(200);
        const finalized = await build
          .$query()
          .withGraphFetched("compareScreenshotBucket");
        invariant(finalized.compareScreenshotBucket);
        expect(finalized.compareScreenshotBucket.complete).toBe(true);

        // Retry of that request after the build is finalized must not 409.
        await put(build.id, onlyShard).expect(200);
        expect(await countShards(build.id)).toBe(1);
      },
    );

    parallelTest(
      "requires a parallelIndex when the request is not final",
      async ({ build }) => {
        await put(build.id, {
          parallel: true,
          parallelTotal: 2,
          screenshots: [screenshot("a", "a")],
          final: false,
        })
          .expect(400)
          .expect((res) => {
            expect(res.body.error).toBe(
              "`parallelIndex` is required when `final` is `false`",
            );
          });
      },
    );
  });
});
