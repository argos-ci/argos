import { beforeEach, describe, expect, it } from "vitest";

import type { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getAccountBuildMetrics, getAccountScreenshotMetrics } from "./account";

describe("getAccountScreenshotMetrics", () => {
  let project: Project;

  beforeEach(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    project = await factory.Project.create({
      id: "1000000",
      githubRepositoryId: null,
    });
    await factory.ScreenshotBucket.createMany(3, [
      {
        createdAt: new Date("2021-01-01").toISOString(),
        projectId: project.id,
        screenshotCount: 20,
      },
      {
        createdAt: new Date("2021-01-02").toISOString(),
        projectId: project.id,
        screenshotCount: 4,
      },
      {
        createdAt: new Date("2021-01-03").toISOString(),
        projectId: project.id,
        screenshotCount: 10,
      },
    ]);
  });

  describe.each(["month", "week", "day"] as const)(
    "with groupBy %s",
    (groupBy) => {
      describe("with projectIds", () => {
        it("returns the count of screenshots", async () => {
          const results = await getAccountScreenshotMetrics({
            accountId: project.accountId,
            projectIds: [project.id],
            from: new Date("2020-12-01"),
            to: new Date("2021-02-01"),
            groupBy,
          });

          expect(results.series).toMatchSnapshot();
          expect(results.all).toMatchSnapshot();
        });
      });

      describe("without projectIds", () => {
        it("returns the count of screenshots", async () => {
          const results = await getAccountScreenshotMetrics({
            accountId: project.accountId,
            from: new Date("2020-12-01"),
            to: new Date("2021-02-01"),
            groupBy,
          });

          expect(results.series).toMatchSnapshot();
          expect(results.all).toMatchSnapshot();
        });
      });
    },
  );
});

describe("getAccountBuildMetrics", () => {
  let project: Project;

  beforeEach(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    project = await factory.Project.create({
      id: "1000000",
      githubRepositoryId: null,
    });
    const [, approvedBuild, rejectedBuild, dismissedBuild] =
      await factory.Build.createMany(4, [
        {
          createdAt: new Date("2021-01-01").toISOString(),
          projectId: project.id,
          conclusion: "no-changes",
        },
        {
          createdAt: new Date("2021-01-01").toISOString(),
          projectId: project.id,
          conclusion: "changes-detected",
        },
        {
          createdAt: new Date("2021-01-02").toISOString(),
          projectId: project.id,
          conclusion: "changes-detected",
        },
        {
          createdAt: new Date("2021-01-03").toISOString(),
          projectId: project.id,
          conclusion: "changes-detected",
        },
      ]);
    const user = await factory.User.create();
    await factory.BuildReview.createMany(4, [
      // Approved build.
      { buildId: approvedBuild!.id, state: "approved" },
      // Approved then rejected by the same user, only the latest counts.
      {
        buildId: rejectedBuild!.id,
        userId: user.id,
        state: "approved",
        createdAt: new Date("2021-01-02T10:00:00Z").toISOString(),
      },
      {
        buildId: rejectedBuild!.id,
        userId: user.id,
        state: "rejected",
        createdAt: new Date("2021-01-02T11:00:00Z").toISOString(),
      },
      // Dismissed reviews are ignored.
      {
        buildId: dismissedBuild!.id,
        state: "approved",
        dismissedAt: new Date("2021-01-03T10:00:00Z").toISOString(),
        dismissedById: user.id,
      },
    ]);
  });

  describe.each(["month", "week", "day"] as const)(
    "with groupBy %s",
    (groupBy) => {
      describe("with projectIds", () => {
        it("returns the count of builds", async () => {
          const results = await getAccountBuildMetrics({
            accountId: project.accountId,
            projectIds: [project.id],
            from: new Date("2020-12-01"),
            to: new Date("2021-02-01"),
            groupBy,
          });

          expect(results.series).toMatchSnapshot();
          expect(results.all).toMatchSnapshot();
        });
      });

      describe("without projectIds", () => {
        it("returns the count of builds", async () => {
          const results = await getAccountBuildMetrics({
            accountId: project.accountId,
            from: new Date("2020-12-01"),
            to: new Date("2021-02-01"),
            groupBy,
          });

          expect(results.series).toMatchSnapshot();
          expect(results.all).toMatchSnapshot();
        });
      });
    },
  );
});
