import { describe, expect, test as base } from "vitest";

import { factory } from "@/database/testing";
import { setupDatabase } from "@/database/testing/util";

import { getAggregatedNotification } from "./aggregated";

const test = base.extend<{
  projectId: string;
  commit: string;
}>({
  projectId: async ({}, use) => {
    await setupDatabase();
    const project = await factory.Project.create();
    await use(project.id);
  },
  commit: async ({}, use) => {
    await use("58ca89145e1f072e45e112a6158d17a23f54602d");
  },
});

describe("#getAggregatedNotification", () => {
  describe("with a single build", () => {
    test("returns null", async ({ projectId, commit }) => {
      const compareBucket = await factory.ScreenshotBucket.create({
        projectId,
        commit,
      });
      const build = await factory.Build.create({
        projectId,
        baseScreenshotBucketId: null,
        compareScreenshotBucketId: compareBucket.id,
        jobStatus: "pending",
      });
      await factory.BuildNotification.create({
        buildId: build.id,
      });
      const notification = await getAggregatedNotification({
        projectId,
        commit,
        buildType: "check",
        summaryCheckConfig: "auto",
      });
      expect(notification).toBeNull();
    });

    test("returns a notification if config is `always`", async ({
      projectId,
      commit,
    }) => {
      const compareBucket = await factory.ScreenshotBucket.create({
        projectId,
        commit,
      });
      const build = await factory.Build.create({
        projectId,
        baseScreenshotBucketId: null,
        compareScreenshotBucketId: compareBucket.id,
        jobStatus: "pending",
      });
      await factory.BuildNotification.create({
        buildId: build.id,
      });
      const notification = await getAggregatedNotification({
        projectId,
        commit,
        buildType: "check",
        summaryCheckConfig: "always",
      });
      expect(notification).toEqual({
        context: "argos/summary",
        description: "No diff detected",
        github: { state: "success" },
        gitlab: { state: "success" },
      });
    });
  });

  describe("with multiple builds", () => {
    test("returns a notification", async ({ projectId, commit }) => {
      const buckets = await factory.ScreenshotBucket.createMany(2, {
        projectId,
        commit,
      });
      const builds = await factory.Build.createMany(2, [
        {
          projectId,
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: buckets[0]!.id,
          jobStatus: "pending",
          name: "a",
        },
        {
          projectId,
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: buckets[1]!.id,
          jobStatus: "pending",
          name: "b",
        },
      ]);
      await factory.BuildNotification.createMany(2, [
        {
          buildId: builds[0]!.id,
          type: "diff-detected",
        },
        {
          buildId: builds[1]!.id,
          type: "diff-accepted",
        },
      ]);
      const notification = await getAggregatedNotification({
        projectId,
        commit,
        buildType: "check",
        summaryCheckConfig: "auto",
      });
      expect(notification).toEqual({
        context: "argos/summary",
        description: "Diff detected",
        github: { state: "failure" },
        gitlab: { state: "failed" },
      });
    });

    test("returns null if config is `never`", async ({ projectId, commit }) => {
      const buckets = await factory.ScreenshotBucket.createMany(2, {
        projectId,
        commit,
      });
      const builds = await factory.Build.createMany(2, [
        {
          projectId,
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: buckets[0]!.id,
          jobStatus: "pending",
          name: "a",
        },
        {
          projectId,
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: buckets[1]!.id,
          jobStatus: "pending",
          name: "b",
        },
      ]);
      await factory.BuildNotification.createMany(2, [
        {
          buildId: builds[0]!.id,
          type: "diff-detected",
        },
        {
          buildId: builds[1]!.id,
          type: "diff-accepted",
        },
      ]);
      const notification = await getAggregatedNotification({
        projectId,
        commit,
        buildType: "check",
        summaryCheckConfig: "never",
      });
      expect(notification).toBeNull();
    });
  });

  describe("with multiple builds (2)", () => {
    test("ignores old builds", async ({ projectId, commit }) => {
      const buckets = await factory.ScreenshotBucket.createMany(2, {
        projectId,
        commit,
      });
      const builds = await factory.Build.createMany(3, [
        {
          createdAt: new Date("2021-01-01").toISOString(),
          projectId,
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: buckets[0]!.id,
          jobStatus: "pending",
          name: "a",
        },
        {
          createdAt: new Date("2021-01-02").toISOString(),
          projectId,
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: buckets[1]!.id,
          jobStatus: "pending",
          name: "a",
        },
        {
          createdAt: new Date("2021-01-02").toISOString(),
          projectId,
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: buckets[1]!.id,
          jobStatus: "pending",
          name: "b",
        },
      ]);
      await factory.BuildNotification.createMany(3, [
        {
          buildId: builds[0]!.id,
          type: "diff-detected",
        },
        {
          buildId: builds[1]!.id,
          type: "diff-accepted",
        },
        {
          buildId: builds[1]!.id,
          type: "diff-accepted",
        },
      ]);
      const notification = await getAggregatedNotification({
        projectId,
        commit,
        buildType: "check",
        summaryCheckConfig: "auto",
      });
      expect(notification).toEqual({
        context: "argos/summary",
        description: "Diff accepted",
        github: { state: "success" },
        gitlab: { state: "success" },
      });
    });
  });
});
