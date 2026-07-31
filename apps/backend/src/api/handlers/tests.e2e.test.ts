import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import {
  IgnoredChange,
  UserAccessTokenScope,
  type Account,
  type Build,
  type Project,
  type Test as TestModel,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";
import { upsertTestStats } from "@/metrics/test";
import { formatTestId } from "@/util/test-id";

import { createTestHandlerApp } from "../test-util";
import { getTest } from "./getTest";
import { listTestChanges } from "./listTestChanges";

const app = createTestHandlerApp(getTest, listTestChanges);

const RECURRING_FINGERPRINT = "recurring-fingerprint";
const ONE_OFF_FINGERPRINT = "one-off-fingerprint";

/** Minutes ago, so every seeded row stays inside every metrics period. */
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

/**
 * A test that ran in four auto-approved builds and changed in three of them:
 * twice with the exact same diff (a recurring, flaky-looking change) and once
 * with another one.
 */
const test = base.extend<{
  factory: typeof factory;
  account: Account;
  patToken: string;
  project: Project;
  testModel: TestModel;
  builds: Build[];
  seeded: { testId: string; publicTestId: string };
}>({
  factory: async ({}, use) => {
    await setupDatabase();
    await use(factory);
  },
  account: async ({ factory }, use) => {
    const account = await factory.TeamAccount.create({ slug: "acme" });
    await use(account);
  },
  patToken: async ({ factory, account }, use) => {
    const user = await factory.User.create();
    await Promise.all([
      factory.UserAccount.create({ userId: user.id }),
      factory.TeamUser.create({
        teamId: account.teamId,
        userId: user.id,
        userLevel: "member",
      }),
    ]);
    const token = `arp_${"a".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: user.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: account.id,
    });
    await use(token);
  },
  project: async ({ factory, account }, use) => {
    const project = await factory.Project.create({
      accountId: account.id,
      name: "flaky-project",
      token: "token-flaky",
    });
    await use(project);
  },
  testModel: async ({ factory, project }, use) => {
    const testModel = await factory.Test.create({
      projectId: project.id,
      name: "Home page › renders the hero",
      buildName: "default",
    });
    await use(testModel);
  },
  builds: async ({ factory, project }, use) => {
    const builds = await factory.Build.createMany(4, [
      { projectId: project.id, type: "reference", createdAt: minutesAgo(40) },
      { projectId: project.id, type: "reference", createdAt: minutesAgo(30) },
      { projectId: project.id, type: "reference", createdAt: minutesAgo(20) },
      { projectId: project.id, type: "reference", createdAt: minutesAgo(10) },
    ]);
    await use(builds);
  },
  seeded: async ({ factory, project, testModel, builds }, use) => {
    const [unchangedBuild, firstChangeBuild, secondChangeBuild, lastBuild] =
      builds;
    invariant(
      unchangedBuild && firstChangeBuild && secondChangeBuild && lastBuild,
    );

    const [recurringFile, oneOffFile, screenshotFile] =
      await factory.File.createMany(3, [
        {
          key: "recurring-diff-key",
          type: "screenshotDiff",
          fingerprint: RECURRING_FINGERPRINT,
        },
        {
          key: "one-off-diff-key",
          type: "screenshotDiff",
          fingerprint: ONE_OFF_FINGERPRINT,
        },
        { key: "screenshot-key", type: "screenshot" },
      ]);
    invariant(recurringFile && oneOffFile && screenshotFile);

    const [baseScreenshot, compareScreenshot] =
      await factory.Screenshot.createMany(2, [
        {
          screenshotBucketId: unchangedBuild.compareScreenshotBucketId,
          testId: testModel.id,
          name: "hero.png",
          fileId: screenshotFile.id,
          s3Id: screenshotFile.key,
        },
        {
          screenshotBucketId: lastBuild.compareScreenshotBucketId,
          testId: testModel.id,
          name: "hero.png",
          fileId: screenshotFile.id,
          s3Id: screenshotFile.key,
        },
      ]);
    invariant(baseScreenshot && compareScreenshot);

    await factory.ScreenshotDiff.createMany(4, [
      {
        buildId: unchangedBuild.id,
        testId: testModel.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot.id,
        score: 0,
        createdAt: minutesAgo(40),
      },
      {
        buildId: firstChangeBuild.id,
        testId: testModel.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot.id,
        score: 0.4,
        fileId: recurringFile.id,
        s3Id: recurringFile.key,
        fingerprint: RECURRING_FINGERPRINT,
        createdAt: minutesAgo(30),
      },
      {
        buildId: secondChangeBuild.id,
        testId: testModel.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot.id,
        score: 0.4,
        fileId: recurringFile.id,
        s3Id: recurringFile.key,
        fingerprint: RECURRING_FINGERPRINT,
        createdAt: minutesAgo(20),
      },
      {
        buildId: lastBuild.id,
        testId: testModel.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot.id,
        score: 0.6,
        fileId: oneOffFile.id,
        s3Id: oneOffFile.key,
        fingerprint: ONE_OFF_FINGERPRINT,
        createdAt: minutesAgo(10),
      },
    ]);

    // The stats tables are written by the diff job, so seed them the same way.
    const date = new Date();
    await upsertTestStats({ testId: testModel.id, date, change: null });
    for (const fingerprint of [
      RECURRING_FINGERPRINT,
      RECURRING_FINGERPRINT,
      ONE_OFF_FINGERPRINT,
    ]) {
      await upsertTestStats({
        testId: testModel.id,
        date,
        change: { fileId: recurringFile.id, fingerprint },
      });
    }

    await use({
      testId: testModel.id,
      publicTestId: formatTestId({
        projectName: project.name,
        testId: testModel.id,
      }),
    });
  },
});

const getTestPath = (input: {
  owner: string;
  project: string;
  testId: string;
}) => `/projects/${input.owner}/${input.project}/tests/${input.testId}`;

describe("tests", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  describe("getTest", () => {
    test("returns 401 without a valid token", async ({ project, seeded }) => {
      await request(app)
        .get(
          getTestPath({
            owner: "acme",
            project: project.name,
            testId: seeded.publicTestId,
          }),
        )
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.body.error).toContain("Project not found in Argos");
        })
        .expect(401);
    });

    // A project token is bound to a single project, so a test it cannot reach is
    // indistinguishable from one that does not exist — both are a 401.
    test("returns 401 for an unknown test id", async ({ project }) => {
      await request(app)
        .get(
          getTestPath({
            owner: "acme",
            project: project.name,
            testId: "FLAKY-PROJECT-nope",
          }),
        )
        .set("Authorization", `Bearer ${project.token}`)
        .expect((res) => {
          expect(res.body.error).toBe("Unauthorized");
        })
        .expect(401);
    });

    test("returns 404 for an unknown test id with a personal access token", async ({
      project,
      patToken,
    }) => {
      await request(app)
        .get(
          getTestPath({
            owner: "acme",
            project: project.name,
            testId: "FLAKY-PROJECT-nope",
          }),
        )
        .set("Authorization", `Bearer ${patToken}`)
        .expect((res) => {
          expect(res.body.error).toBe("Not found");
        })
        .expect(404);
    });

    test("returns 404 for a test addressed through another project", async ({
      factory,
      account,
      project,
      patToken,
    }) => {
      const otherProject = await factory.Project.create({
        accountId: account.id,
        name: "other-project",
      });
      const otherTest = await factory.Test.create({
        projectId: otherProject.id,
      });

      await request(app)
        .get(
          getTestPath({
            owner: "acme",
            project: project.name,
            testId: formatTestId({
              projectName: otherProject.name,
              testId: otherTest.id,
            }),
          }),
        )
        .set("Authorization", `Bearer ${patToken}`)
        .expect((res) => {
          expect(res.body.error).toBe("Not found");
        })
        .expect(404);
    });

    test("returns the test with a personal access token", async ({
      project,
      seeded,
      patToken,
    }) => {
      const res = await request(app)
        .get(
          getTestPath({
            owner: "acme",
            project: project.name,
            testId: seeded.publicTestId,
          }),
        )
        .set("Authorization", `Bearer ${patToken}`)
        .expect(200);

      expect(res.body.id).toBe(seeded.publicTestId);
    });

    test("returns the test with its flakiness metrics", async ({
      project,
      testModel,
      seeded,
    }) => {
      const res = await request(app)
        .get(
          getTestPath({
            owner: "acme",
            project: project.name,
            testId: seeded.publicTestId,
          }),
        )
        .set("Authorization", `Bearer ${project.token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: seeded.publicTestId,
        name: testModel.name,
        buildName: "default",
        status: "ongoing",
      });
      expect(res.body.url).toContain(`/tests/${seeded.publicTestId}`);
      expect(res.body.metrics).toMatchObject({
        total: 4,
        changes: 3,
        uniqueChanges: 2,
        stability: 0.25,
      });
      expect(res.body.metrics.flakiness).toBeGreaterThan(0);
      expect(res.body.series.length).toBeGreaterThan(0);
      // The first change is the earliest diff carrying an image, the last one
      // the most recent — the one-off change of the latest build.
      expect(res.body.firstSeenChange).toMatchObject({
        buildNumber: 2,
      });
      expect(res.body.firstSeenChange.url).toContain("recurring-diff-key");
      expect(res.body.lastSeenChange).toMatchObject({
        buildNumber: 4,
      });
      expect(res.body.lastSeenChange.url).toContain("one-off-diff-key");
    });

    test("reports a test missing from the latest build as removed", async ({
      factory,
      project,
      builds,
      seeded,
    }) => {
      const [firstBuild] = builds;
      invariant(firstBuild);
      const goneTest = await factory.Test.create({
        projectId: project.id,
        name: "Removed test",
        buildName: "default",
      });
      await factory.ScreenshotDiff.create({
        buildId: firstBuild.id,
        testId: goneTest.id,
        baseScreenshotId: null,
        compareScreenshotId: null,
        score: 0,
      });
      // Depend on the seeded fixture so the latest build exists and holds no
      // diff of this test.
      expect(seeded.testId).not.toBe(goneTest.id);

      const res = await request(app)
        .get(
          getTestPath({
            owner: "acme",
            project: project.name,
            testId: formatTestId({
              projectName: project.name,
              testId: goneTest.id,
            }),
          }),
        )
        .set("Authorization", `Bearer ${project.token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        status: "removed",
        firstSeenChange: null,
        lastSeenChange: null,
      });
    });
  });

  describe("listTestChanges", () => {
    test("returns 401 without a valid token", async ({ project, seeded }) => {
      await request(app)
        .get(
          `${getTestPath({
            owner: "acme",
            project: project.name,
            testId: seeded.publicTestId,
          })}/changes`,
        )
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.body.error).toContain("Project not found in Argos");
        })
        .expect(401);
    });

    test("returns the changes, the ones coming back most often first", async ({
      project,
      seeded,
    }) => {
      const res = await request(app)
        .get(
          `${getTestPath({
            owner: "acme",
            project: project.name,
            testId: seeded.publicTestId,
          })}/changes`,
        )
        .set("Authorization", `Bearer ${project.token}`)
        .expect(200);

      expect(res.body.pageInfo).toEqual({ total: 2, page: 1, perPage: 30 });
      expect(res.body.results).toHaveLength(2);

      const [recurring, oneOff] = res.body.results;
      expect(recurring).toMatchObject({
        ignored: false,
        occurrences: 2,
      });
      // The change ids are the ones the ignore endpoints take.
      expect(recurring.id).toContain(seeded.publicTestId);
      expect(recurring.firstSeen.buildNumber).toBe(2);
      expect(recurring.lastSeen.buildNumber).toBe(3);
      expect(recurring.diff).toMatchObject({
        status: "changed",
        score: 0.4,
        test: { id: seeded.publicTestId },
        change: { ignored: false, occurrences: 2 },
      });
      expect(recurring.diff.url).toContain("recurring-diff-key");
      expect(recurring.diff.base.url).toContain("screenshot-key");
      expect(recurring.diff.head.url).toContain("screenshot-key");

      expect(oneOff).toMatchObject({ ignored: false, occurrences: 1 });
      expect(oneOff.firstSeen.buildNumber).toBe(4);
      expect(oneOff.lastSeen.buildNumber).toBe(4);
      expect(oneOff.diff.url).toContain("one-off-diff-key");
    });

    test("reports and filters on the ignore state", async ({
      project,
      seeded,
    }) => {
      await IgnoredChange.query().insert({
        projectId: project.id,
        testId: seeded.testId,
        fingerprint: ONE_OFF_FINGERPRINT,
      });

      const path = `${getTestPath({
        owner: "acme",
        project: project.name,
        testId: seeded.publicTestId,
      })}/changes`;

      const [all, ignored, reviewable] = await Promise.all([
        request(app)
          .get(path)
          .set("Authorization", `Bearer ${project.token}`)
          .expect(200),
        request(app)
          .get(`${path}?ignored=true`)
          .set("Authorization", `Bearer ${project.token}`)
          .expect(200),
        request(app)
          .get(`${path}?ignored=false`)
          .set("Authorization", `Bearer ${project.token}`)
          .expect(200),
      ]);

      expect(
        all.body.results.map((change: { ignored: boolean }) => change.ignored),
      ).toEqual([false, true]);
      expect(ignored.body.pageInfo.total).toBe(1);
      expect(ignored.body.results[0].occurrences).toBe(1);
      expect(reviewable.body.pageInfo.total).toBe(1);
      expect(reviewable.body.results[0].occurrences).toBe(2);
    });

    test("paginates", async ({ project, seeded }) => {
      const path = `${getTestPath({
        owner: "acme",
        project: project.name,
        testId: seeded.publicTestId,
      })}/changes`;

      const res = await request(app)
        .get(`${path}?perPage=1&page=2`)
        .set("Authorization", `Bearer ${project.token}`)
        .expect(200);

      expect(res.body.pageInfo).toEqual({ total: 2, page: 2, perPage: 1 });
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].occurrences).toBe(1);
    });

    test("rejects an invalid ignored filter", async ({ project, seeded }) => {
      await request(app)
        .get(
          `${getTestPath({
            owner: "acme",
            project: project.name,
            testId: seeded.publicTestId,
          })}/changes?ignored=maybe`,
        )
        .set("Authorization", `Bearer ${project.token}`)
        .expect((res) => {
          expect(res.body.error).toBe("Invalid request");
        })
        .expect(400);
    });
  });
});
