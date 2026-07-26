import { beforeEach, describe, expect, it } from "vitest";

import {
  AuditTrail,
  IgnoredChange,
  type Test,
  type User,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  ignoreChange,
  isChangeIgnored,
  queryIgnoredChanges,
  unignoreChange,
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
    const pagination = { after: 0, first: 30 };

    it("returns an empty page when nothing is ignored", async () => {
      await expect(
        queryIgnoredChanges({ projectId: test.projectId, ...pagination }),
      ).resolves.toEqual({ total: 0, results: [] });
    });

    it("returns the ignored change", async () => {
      await ignoreChange(identity());

      const { total, results } = await queryIgnoredChanges({
        projectId: test.projectId,
        ...pagination,
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
        ...pagination,
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
        ...pagination,
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
        queryIgnoredChanges({ projectId: test.projectId, ...pagination }),
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
        after: 0,
        first: 1,
      });
      const secondPage = await queryIgnoredChanges({
        projectId: test.projectId,
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
  });
});
