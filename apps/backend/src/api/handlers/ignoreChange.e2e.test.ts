import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import {
  AuditTrail,
  IgnoredChange,
  Project,
  Test,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";
import { formatTestChangeId } from "@/graphql/services/test";

import { createTestHandlerApp } from "../test-util";
import { ignoreChange, unignoreChange } from "./ignoreChange";

const app = createTestHandlerApp(ignoreChange, unignoreChange);

const fingerprint = "a1b2c3d4e5f6";

const test = base.extend<{
  user: User;
  project: Project;
  test: Test;
  changeId: string;
  scopedPatToken: string;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    const user = await factory.User.create();
    await use(user);
  },
  project: async ({ user }, use) => {
    const [, teamAccount] = await Promise.all([
      factory.UserAccount.create({ userId: user.id }),
      factory.TeamAccount.create({ slug: "acme" }),
    ]);
    const project = await factory.Project.create({
      accountId: teamAccount.id,
      name: "web",
      token: "the-awesome-token",
    });
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    await use(project);
  },
  test: async ({ project }, use) => {
    const testRecord = await factory.Test.create({ projectId: project.id });
    await use(testRecord);
  },
  changeId: async ({ project, test }, use) => {
    await use(
      formatTestChangeId({
        projectName: project.name,
        testId: test.id,
        fingerprint,
      }),
    );
  },
  scopedPatToken: async ({ user, project }, use) => {
    const token = `arp_${"e".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: user.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: project.accountId,
    });
    await use(token);
  },
});

describe("ignoreChange / unignoreChange", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("ignores a change and records it", async ({
    project,
    test,
    changeId,
    scopedPatToken,
  }) => {
    const res = await request(app)
      .post(`/projects/acme/web/changes/${changeId}/ignore`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(200);

    expect(res.body).toEqual({
      id: changeId,
      ignored: true,
      occurrences: 0,
    });

    const [ignoredChanges, auditTrails] = await Promise.all([
      IgnoredChange.query(),
      AuditTrail.query(),
    ]);
    expect(ignoredChanges).toHaveLength(1);
    expect(ignoredChanges[0]).toMatchObject({
      projectId: project.id,
      testId: test.id,
      fingerprint,
    });
    expect(auditTrails[0]).toMatchObject({ action: "files.ignored" });
  });

  test("unignores a change", async ({
    project,
    test,
    changeId,
    scopedPatToken,
  }) => {
    await IgnoredChange.query().insert({
      projectId: project.id,
      testId: test.id,
      fingerprint,
    });

    const res = await request(app)
      .post(`/projects/acme/web/changes/${changeId}/unignore`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(200);

    expect(res.body).toMatchObject({ id: changeId, ignored: false });
    await expect(IgnoredChange.query().resultSize()).resolves.toBe(0);
  });

  test("returns the occurrences of the change", async ({
    test,
    changeId,
    scopedPatToken,
  }) => {
    await Test.knex()("test_stats_fingerprints").insert({
      testId: test.id,
      fingerprint,
      date: new Date(),
      value: 5,
    });

    const res = await request(app)
      .post(`/projects/acme/web/changes/${changeId}/ignore`)
      .set("Authorization", `Bearer ${scopedPatToken}`)
      .expect(200);

    expect(res.body.occurrences).toBe(5);
  });

  test("returns 404 for an invalid change id", async ({ scopedPatToken }) => {
    const res = await request(app)
      .post(`/projects/acme/web/changes/not-a-real-change/ignore`)
      .set("Authorization", `Bearer ${scopedPatToken}`);
    expect(res.status).toBe(404);
  });

  test("returns 404 when the test belongs to another project", async ({
    scopedPatToken,
  }) => {
    const otherProject = await factory.Project.create({ name: "other" });
    const otherTest = await factory.Test.create({
      projectId: otherProject.id,
    });
    const foreignChangeId = formatTestChangeId({
      projectName: "web",
      testId: otherTest.id,
      fingerprint,
    });

    const res = await request(app)
      .post(`/projects/acme/web/changes/${foreignChangeId}/ignore`)
      .set("Authorization", `Bearer ${scopedPatToken}`);
    expect(res.status).toBe(404);
  });

  test("returns 401 without authentication", async ({ changeId }) => {
    const res = await request(app).post(
      `/projects/acme/web/changes/${changeId}/ignore`,
    );
    expect(res.status).toBe(401);
  });

  test("returns 400 when the ignore feature is disabled", async ({
    project,
    changeId,
    scopedPatToken,
  }) => {
    await project.$query().patch({ ignoreConfig: { enabled: false } });

    const res = await request(app)
      .post(`/projects/acme/web/changes/${changeId}/ignore`)
      .set("Authorization", `Bearer ${scopedPatToken}`);
    expect(res.status).toBe(400);
  });
});
