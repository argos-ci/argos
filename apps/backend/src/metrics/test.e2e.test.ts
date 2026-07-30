import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { knex } from "@/database";
import type { File, Test } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  getChangesTotalOccurrences,
  getTestAllMetrics,
  upsertTestStats,
} from "./test";

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
    it("upsert stats into test_stats_fingerprints and test_stats_builds", async () => {
      await upsertTestStats({
        testId: test.id,
        date: new Date("2025-06-02T09:18:00.000Z"),
        change: {
          fileId: file.id,
          fingerprint: "xx",
        },
      });

      const [buildsStats, fingerprintStats] = await Promise.all([
        knex("test_stats_builds"),
        knex("test_stats_fingerprints"),
      ]);
      expect(buildsStats).toHaveLength(1);
      expect(buildsStats[0]).toEqual({
        testId: test.id,
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

      const [buildsStats, fingerprintStats] = await Promise.all([
        knex("test_stats_builds"),
        knex("test_stats_fingerprints"),
      ]);
      expect(buildsStats).toHaveLength(1);
      expect(buildsStats[0]).toEqual({
        testId: test.id,
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

describe("getChangesTotalOccurrences", () => {
  let test: Test;

  beforeEach(async () => {
    await setupDatabase();
    test = await factory.Test.create();

    // Two occurrences of "aa" on 2025-06-01, one on 2025-06-10, and one
    // occurrence of "bb" on 2025-06-10.
    await knex("test_stats_fingerprints").insert([
      {
        testId: test.id,
        fingerprint: "aa",
        date: new Date("2025-06-01T00:00:00.000Z"),
        value: 2,
      },
      {
        testId: test.id,
        fingerprint: "aa",
        date: new Date("2025-06-10T00:00:00.000Z"),
        value: 1,
      },
      {
        testId: test.id,
        fingerprint: "bb",
        date: new Date("2025-06-10T00:00:00.000Z"),
        value: 1,
      },
    ]);
  });

  it("returns an empty array for no changes", async () => {
    await expect(getChangesTotalOccurrences([], {})).resolves.toEqual([]);
  });

  it("sums occurrences per change, aligned to the input order", async () => {
    const result = await getChangesTotalOccurrences(
      [
        { testId: test.id, fingerprint: "aa" },
        { testId: test.id, fingerprint: "bb" },
        { testId: test.id, fingerprint: "missing" },
      ],
      {},
    );
    expect(result).toEqual([3, 1, 0]);
  });

  it("only counts occurrences on or after `from`", async () => {
    const result = await getChangesTotalOccurrences(
      [
        { testId: test.id, fingerprint: "aa" },
        { testId: test.id, fingerprint: "bb" },
      ],
      { from: new Date("2025-06-05T00:00:00.000Z") },
    );
    expect(result).toEqual([1, 1]);
  });
});

describe("getTestAllMetrics", () => {
  let test: Test;
  let otherTest: Test;

  beforeEach(async () => {
    await setupDatabase();
    [test, otherTest] = await Promise.all([
      factory.Test.create(),
      factory.Test.create(),
    ]);

    // 10 builds saw the test over two days.
    await knex("test_stats_builds").insert([
      {
        testId: test.id,
        date: new Date("2025-06-01T00:00:00.000Z"),
        value: 6,
      },
      {
        testId: test.id,
        date: new Date("2025-06-02T00:00:00.000Z"),
        value: 4,
      },
    ]);

    // "aa" recurs across two days (not unique), "bb" only shows up on one.
    await knex("test_stats_fingerprints").insert([
      {
        testId: test.id,
        fingerprint: "aa",
        date: new Date("2025-06-01T00:00:00.000Z"),
        value: 2,
      },
      {
        testId: test.id,
        fingerprint: "aa",
        date: new Date("2025-06-02T00:00:00.000Z"),
        value: 1,
      },
      {
        testId: test.id,
        fingerprint: "bb",
        date: new Date("2025-06-02T00:00:00.000Z"),
        value: 1,
      },
    ]);
  });

  const period = {
    from: new Date("2025-06-01T00:00:00.000Z"),
    to: new Date("2025-06-03T00:00:00.000Z"),
  };

  it("counts a fingerprint as a unique change only when it appears on one day", async () => {
    const [metrics] = await getTestAllMetrics([test.id], period);
    invariant(metrics);

    expect(metrics.total).toBe(10);
    expect(metrics.changes).toBe(4);
    // "bb" only — "aa" spans two days.
    expect(metrics.uniqueChanges).toBe(1);
    expect(metrics.stability).toBe(0.6);
    expect(metrics.consistency).toBe(0.25);
    // 1 - (0.6 + 0.25) / 2 is exactly 0.575, which in binary floating point
    // sits just under the midpoint and rounds down.
    expect(metrics.flakiness).toBe(0.57);
  });

  it("returns zeroed metrics aligned to the input order", async () => {
    const results = await getTestAllMetrics([otherTest.id, test.id], period);

    expect(results[0]).toEqual({
      total: 0,
      changes: 0,
      uniqueChanges: 0,
      stability: 1,
      consistency: 1,
      flakiness: 0,
    });
    expect(results[1]?.changes).toBe(4);
  });

  it("only counts stats within the period", async () => {
    const [metrics] = await getTestAllMetrics([test.id], {
      from: new Date("2025-06-02T00:00:00.000Z"),
      to: new Date("2025-06-03T00:00:00.000Z"),
    });
    invariant(metrics);

    expect(metrics.total).toBe(4);
    expect(metrics.changes).toBe(2);
    // Restricted to one day, both fingerprints now appear exactly once.
    expect(metrics.uniqueChanges).toBe(2);
  });
});
