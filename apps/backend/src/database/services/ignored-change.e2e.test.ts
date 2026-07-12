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
});
