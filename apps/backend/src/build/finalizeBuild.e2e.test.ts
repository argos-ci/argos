import { test as base, describe, expect } from "vitest";

import { knex } from "@/database";
import type { Build } from "@/database/models";
import { ScreenshotBucket } from "@/database/models";
import { factory } from "@/database/testing";
import { setupDatabase } from "@/database/testing/util";
import { ARGOS_STORYBOOK_SDK_NAME } from "@/util/argos-sdk";

import { finalizeBuild } from "./finalizeBuild";

const test = base.extend<{ build: Build }>({
  build: async ({}, use) => {
    await setupDatabase();
    const build = await factory.Build.create();
    // Counts nothing like what the bucket holds, so the assertions below can
    // only pass if the finalization recomputed them.
    await build.$relatedQuery("compareScreenshotBucket").patch({
      complete: false,
      screenshotCount: 99,
      storybookScreenshotCount: 99,
    });
    await use(build);
  },
});

function screenshotMetadata(sdkName: string) {
  return {
    sdk: { name: sdkName, version: "1.0.0" },
    automationLibrary: { name: "playwright", version: "1.0.0" },
  };
}

function getCompareBucket(build: Build) {
  return ScreenshotBucket.query()
    .findById(build.compareScreenshotBucketId)
    .throwIfNotFound();
}

describe("#finalizeBuild", () => {
  test("counts the screenshots of the compare bucket, split by SDK", async ({
    build,
  }) => {
    await factory.Screenshot.createMany(2, {
      screenshotBucketId: build.compareScreenshotBucketId,
      metadata: screenshotMetadata(ARGOS_STORYBOOK_SDK_NAME),
    });
    await factory.Screenshot.createMany(3, {
      screenshotBucketId: build.compareScreenshotBucketId,
      metadata: screenshotMetadata("@argos-ci/playwright"),
    });

    await finalizeBuild({ build });

    const bucket = await getCompareBucket(build);
    expect(bucket.complete).toBe(true);
    expect(bucket.screenshotCount).toBe(5);
    expect(bucket.storybookScreenshotCount).toBe(2);
  });

  test("reads both counts in a single query", async ({ build }) => {
    // The two counts must share one `READ COMMITTED` snapshot. Taken by two
    // queries, a screenshot inserted in between is seen by the second one
    // only, and the bucket ends up holding more Storybook screenshots than
    // screenshots — making the neutral count derived from the pair negative.
    await factory.Screenshot.createMany(3, {
      screenshotBucketId: build.compareScreenshotBucketId,
      metadata: screenshotMetadata(ARGOS_STORYBOOK_SDK_NAME),
    });

    const countQueries: string[] = [];
    const onQuery = (query: { sql: string }) => {
      if (query.sql.includes(`from "screenshots"`)) {
        countQueries.push(query.sql);
      }
    };
    knex.on("query", onQuery);
    try {
      await finalizeBuild({ build });
    } finally {
      knex.off("query", onQuery);
    }

    expect(countQueries).toHaveLength(1);
  });

  test("uses the pre-computed counts when they are given", async ({
    build,
  }) => {
    await factory.Screenshot.create({
      screenshotBucketId: build.compareScreenshotBucketId,
      metadata: screenshotMetadata(ARGOS_STORYBOOK_SDK_NAME),
    });

    await finalizeBuild({
      build,
      metadata: null,
      screenshotCount: { all: 0, storybook: 0 },
    });

    const bucket = await getCompareBucket(build);
    expect(bucket.screenshotCount).toBe(0);
    expect(bucket.storybookScreenshotCount).toBe(0);
  });
});
