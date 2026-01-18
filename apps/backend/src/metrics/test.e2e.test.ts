import { beforeEach, describe, expect, it } from "vitest";

import { knex } from "@/database";
import type { File, Test } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { upsertTestStats } from "./test";

describe("upsertTestStats", () => {
  let test: Test;
  let file: File;

  beforeEach(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    [test, file] = await Promise.all([
      factory.Test.create(),
      factory.File.create({ type: "screenshotDiff", fingerprint: "xx" }),
    ]);

    const builds = await factory.Build.createMany(3, {
      projectId: test.projectId,
      type: "reference",
    });

    await factory.ScreenshotDiff.createMany(3, [
      {
        buildId: builds[0]!.id,
        testId: test.id,
        createdAt: "2025-06-02T09:12:00.000Z",
        score: 0.5,
        fileId: file.id,
      },
      {
        buildId: builds[1]!.id,
        testId: test.id,
        createdAt: "2025-06-02T09:18:00.000Z",
        score: 0,
      },
      {
        buildId: builds[2]!.id,
        testId: test.id,
        createdAt: "2025-06-02T09:23:00.000Z",
        score: 0.3,
        fileId: file.id,
      },
    ]);
  });

  describe('without "change"', () => {
    it("upsert stats into test_stats_builds", async () => {
      await upsertTestStats({
        testId: test.id,
        date: new Date("2025-06-02T09:18:00.000Z"),
        change: null,
      });

      const buildsStats = await knex("test_stats_builds");
      expect(buildsStats).toHaveLength(1);
      expect(buildsStats[0]).toEqual({
        testId: test.id,
        date: new Date("2025-06-02T00:00:00.000Z"),
        value: 1,
      });
    });
  });

  describe('with "change"', () => {
    it("upsert stats into test_stats_changes, test_stats_fingerprints and test_stats_builds", async () => {
      await upsertTestStats({
        testId: test.id,
        date: new Date("2025-06-02T09:18:00.000Z"),
        change: {
          fileId: file.id,
          fingerprint: "xx",
        },
      });

      const [buildsStats, changesStats, fingerprintStats] = await Promise.all([
        knex("test_stats_builds"),
        knex("test_stats_changes"),
        knex("test_stats_fingerprints"),
      ]);
      expect(buildsStats).toHaveLength(1);
      expect(buildsStats[0]).toEqual({
        testId: test.id,
        date: new Date("2025-06-02T00:00:00.000Z"),
        value: 1,
      });

      expect(changesStats).toHaveLength(1);
      expect(changesStats[0]).toEqual({
        testId: test.id,
        fileId: file.id,
        date: new Date("2025-06-02T00:00:00.000Z"),
        value: 1,
      });

      expect(fingerprintStats).toHaveLength(1);
      expect(fingerprintStats[0]).toEqual({
        testId: test.id,
        fingerprint: "xx",
        date: new Date("2025-06-02T00:00:00.000Z"),
        value: 1,
      });
    });

    it("supports if already present in database", async () => {
      await upsertTestStats({
        testId: test.id,
        date: new Date("2025-06-02T09:18:00.000Z"),
        change: {
          fileId: file.id,
          fingerprint: "xx",
        },
      });

      await upsertTestStats({
        testId: test.id,
        date: new Date("2025-06-02T09:18:00.000Z"),
        change: {
          fileId: file.id,
          fingerprint: "xx",
        },
      });

      const [buildsStats, changesStats, fingerprintStats] = await Promise.all([
        knex("test_stats_builds"),
        knex("test_stats_changes"),
        knex("test_stats_fingerprints"),
      ]);
      expect(buildsStats).toHaveLength(1);
      expect(buildsStats[0]).toEqual({
        testId: test.id,
        date: new Date("2025-06-02T00:00:00.000Z"),
        value: 2,
      });

      expect(changesStats).toHaveLength(1);
      expect(changesStats[0]).toEqual({
        testId: test.id,
        fileId: file.id,
        date: new Date("2025-06-02T00:00:00.000Z"),
        value: 2,
      });

      expect(fingerprintStats).toHaveLength(1);
      expect(fingerprintStats[0]).toEqual({
        testId: test.id,
        fingerprint: "xx",
        date: new Date("2025-06-02T00:00:00.000Z"),
        value: 2,
      });
    });
  });
});
