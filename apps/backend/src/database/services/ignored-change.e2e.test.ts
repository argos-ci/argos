import { beforeEach, describe, expect, it } from "vitest";

import { knex } from "@/database";
import {
  AuditTrail,
  IgnoredChange,
  ScreenshotDiff,
  type Test,
  type User,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  ignoreChange,
  isChangeIgnored,
  queryIgnoredChanges,
  unignoreChange,
  type IgnoredChangesOrder,
} from "./ignored-change";

describe("ignored-change service", () => {
  let test: Test;
  let user: User;
  const fingerprint = "fingerprint-1";

  beforeEach(async () => {
    await setupDatabase();
    [test, user] = await Promise.all([
      factory.Test.create(),
      factory.User.create(),
    ]);
  });

  const identity = () => ({
    projectId: test.projectId,
    testId: test.id,
    fingerprint,
    userId: user.id,
  });

  describe("isChangeIgnored", () => {
    it("returns false when the change is not ignored", async () => {
      await expect(
        isChangeIgnored({
          projectId: test.projectId,
          testId: test.id,
          fingerprint,
        }),
      ).resolves.toBe(false);
    });

    it("returns true when the change is ignored", async () => {
      await IgnoredChange.query().insert({
        projectId: test.projectId,
        testId: test.id,
        fingerprint,
      });
      await expect(
        isChangeIgnored({
          projectId: test.projectId,
          testId: test.id,
          fingerprint,
        }),
      ).resolves.toBe(true);
    });
  });

  describe("ignoreChange", () => {
    it("inserts the ignored change and records an audit trail", async () => {
      await ignoreChange(identity());

      const [ignoredChanges, auditTrails] = await Promise.all([
        IgnoredChange.query(),
        AuditTrail.query(),
      ]);

      expect(ignoredChanges).toHaveLength(1);
      expect(ignoredChanges[0]).toMatchObject({
        projectId: test.projectId,
        testId: test.id,
        fingerprint,
      });

      expect(auditTrails).toHaveLength(1);
      expect(auditTrails[0]).toMatchObject({
        projectId: test.projectId,
        testId: test.id,
        fingerprint,
        userId: user.id,
        action: "files.ignored",
      });
    });

    it("is idempotent when the change is already ignored", async () => {
      await ignoreChange(identity());
      await ignoreChange(identity());

      const [ignoredChanges, auditTrails] = await Promise.all([
        IgnoredChange.query(),
        AuditTrail.query(),
      ]);
      expect(ignoredChanges).toHaveLength(1);
      expect(auditTrails).toHaveLength(1);
    });
  });

  describe("unignoreChange", () => {
    it("removes the ignored change and records an audit trail", async () => {
      await ignoreChange(identity());
      await unignoreChange(identity());

      const [ignoredChanges, auditTrails] = await Promise.all([
        IgnoredChange.query(),
        AuditTrail.query().orderBy("action"),
      ]);

      expect(ignoredChanges).toHaveLength(0);
      expect(auditTrails).toHaveLength(2);
      expect(auditTrails.map((trail) => trail.action)).toEqual([
        "files.ignored",
        "files.unignored",
      ]);
    });

    it("is idempotent when the change is not ignored", async () => {
      await unignoreChange(identity());

      const [ignoredChanges, auditTrails] = await Promise.all([
        IgnoredChange.query(),
        AuditTrail.query(),
      ]);
      expect(ignoredChanges).toHaveLength(0);
      expect(auditTrails).toHaveLength(0);
    });
  });

  describe("queryIgnoredChanges", () => {
    const defaultOrder: IgnoredChangesOrder = {
      key: "ignoredAt",
      direction: "desc",
    };
    const listing = { orderBy: defaultOrder, after: 0, first: 30 };

    it("returns an empty page when nothing is ignored", async () => {
      await expect(
        queryIgnoredChanges({ projectId: test.projectId, ...listing }),
      ).resolves.toEqual({ total: 0, results: [] });
    });

    it("returns the ignored change", async () => {
      await ignoreChange(identity());

      const { total, results } = await queryIgnoredChanges({
        projectId: test.projectId,
        ...listing,
      });

      expect(total).toBe(1);
      expect(results).toEqual([{ testId: test.id, fingerprint }]);
    });

    it("orders by the latest ignore date, most recent first", async () => {
      const otherTest = await factory.Test.create({
        projectId: test.projectId,
      });
      await ignoreChange(identity());
      await ignoreChange({
        projectId: test.projectId,
        testId: otherTest.id,
        fingerprint: "fingerprint-2",
        userId: user.id,
      });
      // Re-ignoring moves the first change back to the top: the order comes
      // from the latest `files.ignored` entry, not from the insert order.
      await unignoreChange(identity());
      await ignoreChange(identity());

      const { results } = await queryIgnoredChanges({
        projectId: test.projectId,
        ...listing,
      });

      expect(results.map((row) => row.fingerprint)).toEqual([
        fingerprint,
        "fingerprint-2",
      ]);
    });

    it("keeps a row whose audit trail entry is missing, ordered last", async () => {
      await ignoreChange(identity());
      await IgnoredChange.query().insert({
        projectId: test.projectId,
        testId: test.id,
        fingerprint: "orphan-fingerprint",
      });

      const { total, results } = await queryIgnoredChanges({
        projectId: test.projectId,
        ...listing,
      });

      expect(total).toBe(2);
      expect(results.map((row) => row.fingerprint)).toEqual([
        fingerprint,
        "orphan-fingerprint",
      ]);
    });

    it("excludes unignored changes and other projects", async () => {
      const otherTest = await factory.Test.create();
      await ignoreChange(identity());
      await ignoreChange({
        projectId: otherTest.projectId,
        testId: otherTest.id,
        fingerprint,
        userId: user.id,
      });
      await unignoreChange(identity());

      await expect(
        queryIgnoredChanges({ projectId: test.projectId, ...listing }),
      ).resolves.toEqual({ total: 0, results: [] });
    });

    it("paginates", async () => {
      const tests = await Promise.all([
        factory.Test.create({ projectId: test.projectId }),
        factory.Test.create({ projectId: test.projectId }),
      ]);
      for (const [index, currentTest] of tests.entries()) {
        await ignoreChange({
          projectId: test.projectId,
          testId: currentTest.id,
          fingerprint: `fingerprint-${index}`,
          userId: user.id,
        });
      }

      const firstPage = await queryIgnoredChanges({
        projectId: test.projectId,
        orderBy: defaultOrder,
        after: 0,
        first: 1,
      });
      const secondPage = await queryIgnoredChanges({
        projectId: test.projectId,
        orderBy: defaultOrder,
        after: 1,
        first: 1,
      });

      expect(firstPage.total).toBe(2);
      expect(firstPage.results).toHaveLength(1);
      expect(secondPage.results).toHaveLength(1);
      expect(secondPage.results[0]?.fingerprint).not.toBe(
        firstPage.results[0]?.fingerprint,
      );
    });

    describe("ordering", () => {
      async function ignoreAt(fingerprint: string, date: string) {
        await Promise.all([
          IgnoredChange.query().insert({
            projectId: test.projectId,
            testId: test.id,
            fingerprint,
          }),
          AuditTrail.query().insert({
            date,
            projectId: test.projectId,
            testId: test.id,
            userId: user.id,
            fingerprint,
            action: "files.ignored",
          }),
        ]);
      }

      async function seeAt(input: {
        fingerprint: string;
        createdAt: string;
        fileId: string | null;
      }) {
        const diff = await factory.ScreenshotDiff.create();
        await ScreenshotDiff.query()
          .findById(diff.id)
          .patch({ testId: test.id, ...input });
      }

      /**
       * Three changes that each ordering ranks differently, so that every
       * ordering and direction comes out as its own permutation:
       * - "fp-a" was ignored first, came back 3 times, and has no image left;
       * - "fp-b" only came back before it was ignored, and was seen last;
       * - "fp-c" was ignored last, and came back 3 times too.
       */
      async function createRankedChanges() {
        const file = await factory.File.create({ type: "screenshotDiff" });
        const stat = (fingerprint: string, date: string, value: number) => ({
          testId: test.id,
          fingerprint,
          date,
          value,
        });
        await Promise.all([
          ignoreAt("fp-a", "2026-01-01T00:00:00.000Z"),
          ignoreAt("fp-b", "2026-02-01T00:00:00.000Z"),
          ignoreAt("fp-c", "2026-03-01T00:00:00.000Z"),
          knex("test_stats_fingerprints").insert([
            stat("fp-a", "2026-01-10T00:00:00.000Z", 3),
            stat("fp-b", "2026-01-15T00:00:00.000Z", 9),
            stat("fp-c", "2026-03-10T00:00:00.000Z", 1),
            stat("fp-c", "2026-03-11T00:00:00.000Z", 2),
          ]),
          seeAt({
            fingerprint: "fp-a",
            createdAt: "2026-01-20T00:00:00.000Z",
            fileId: null,
          }),
          seeAt({
            fingerprint: "fp-b",
            createdAt: "2026-03-20T00:00:00.000Z",
            fileId: file.id,
          }),
          seeAt({
            fingerprint: "fp-c",
            createdAt: "2026-03-10T00:00:00.000Z",
            fileId: file.id,
          }),
        ]);
      }

      it.each([
        {
          orderBy: { key: "ignoredAt", direction: "desc" },
          expected: ["fp-c", "fp-b", "fp-a"],
        },
        {
          orderBy: { key: "ignoredAt", direction: "asc" },
          expected: ["fp-a", "fp-b", "fp-c"],
        },
        // "fp-a" and "fp-c" tie, so the ignore date decides between them.
        {
          orderBy: { key: "occurrences", direction: "desc" },
          expected: ["fp-c", "fp-a", "fp-b"],
        },
        {
          orderBy: { key: "occurrences", direction: "asc" },
          expected: ["fp-b", "fp-a", "fp-c"],
        },
        // "fp-a" reads "Never", which sorts as the oldest either way.
        {
          orderBy: { key: "lastSeen", direction: "desc" },
          expected: ["fp-b", "fp-c", "fp-a"],
        },
        {
          orderBy: { key: "lastSeen", direction: "asc" },
          expected: ["fp-a", "fp-c", "fp-b"],
        },
      ] satisfies { orderBy: IgnoredChangesOrder; expected: string[] }[])(
        "orders by $orderBy.key $orderBy.direction",
        async ({ orderBy, expected }) => {
          await createRankedChanges();

          const { results } = await queryIgnoredChanges({
            projectId: test.projectId,
            orderBy,
            after: 0,
            first: 30,
          });

          expect(results.map((row) => row.fingerprint)).toEqual(expected);
        },
      );
    });
  });
});
