import { beforeEach, describe, expect, it } from "vitest";

import type { Project } from "@/database/models/index.js";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { getAccountScreenshotMetrics } from "./account.js";

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
    await factory.ScreenshotBucket.createMany(5, [
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
