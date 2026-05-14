import { test as base, describe, expect } from "vitest";

import type { Build } from "@/database/models/Build";
import { Build as BuildModel } from "@/database/models/Build";
import { factory } from "@/database/testing";
import { setupDatabase } from "@/database/testing/util";
import { getRedisClient } from "@/util/redis/client";

import { concludeBuild } from "./concludeBuild";

const test = base.extend<{
  unfinishedBuild: Build;
}>({
  unfinishedBuild: async ({}, use) => {
    await setupDatabase();
    const build = await factory.Build.create({ conclusion: null });
    await use(build);
  },
});

describe("#concludeBuild", () => {
  test("does not conclude when some diffs are still in progress", async ({
    unfinishedBuild,
  }) => {
    await factory.ScreenshotDiff.create({
      buildId: unfinishedBuild.id,
      jobStatus: "complete",
    });
    await factory.ScreenshotDiff.create({
      buildId: unfinishedBuild.id,
      jobStatus: "progress",
    });

    await concludeBuild({ build: unfinishedBuild, notify: false });

    const refreshed = await BuildModel.query()
      .findById(unfinishedBuild.id)
      .throwIfNotFound();
    expect(refreshed.conclusion).toBeNull();
  });

  test("treats diffs in completedScreenshotDiffIds as complete", async ({
    unfinishedBuild,
  }) => {
    const inProgressDiff = await factory.ScreenshotDiff.create({
      buildId: unfinishedBuild.id,
      jobStatus: "progress",
    });
    await factory.ScreenshotDiff.create({
      buildId: unfinishedBuild.id,
      jobStatus: "complete",
    });

    await concludeBuild({
      build: unfinishedBuild,
      notify: false,
      completedScreenshotDiffIds: [inProgressDiff.id],
    });

    const refreshed = await BuildModel.query()
      .findById(unfinishedBuild.id)
      .throwIfNotFound();
    expect(refreshed.conclusion).toBe("no-changes");
  });

  test("picks up completedScreenshotDiffIds pooled by previous callers", async ({
    unfinishedBuild,
  }) => {
    // Simulates a coalesced burst: a previous caller's IDs were pooled
    // in Redis before bailing. The current caller must see those pooled
    // IDs and treat the corresponding diffs as complete — otherwise the
    // build can stay unconcluded if the bailer's `complete` job hook
    // hasn't fired yet.
    const pooledDiff = await factory.ScreenshotDiff.create({
      buildId: unfinishedBuild.id,
      jobStatus: "progress",
    });
    const redis = await getRedisClient();
    const poolKey = `conclude-build-completed-ids:${unfinishedBuild.id}`;
    await redis.del(poolKey);
    await redis.sAdd(poolKey, [pooledDiff.id]);

    // No completedScreenshotDiffIds in the call — the pooled set must
    // fill in.
    await concludeBuild({ build: unfinishedBuild, notify: false });

    const refreshed = await BuildModel.query()
      .findById(unfinishedBuild.id)
      .throwIfNotFound();
    expect(refreshed.conclusion).toBe("no-changes");
  });
});
