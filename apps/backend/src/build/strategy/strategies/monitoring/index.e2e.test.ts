import { beforeEach, describe, expect, it } from "vitest";

import { Build } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { MonitoringStrategy } from "./index.js";

describe("MonitoringStrategy.getBaseScreenshotBucket", () => {
  let sourceBuild: Build;
  let matchedBuild: Build;

  beforeEach(async () => {
    await setupDatabase();
    const project = await factory.Project.create();
    const [
      firstApproved,
      lastApproved,
      approvedWithOtherMode,
      approvedWithOtherName,
      nonApproved,
      source,
    ] = await factory.Build.createMany(6, [
      {
        projectId: project.id,
        mode: "monitoring",
        jobStatus: "complete",
        name: "default",
      },
      {
        projectId: project.id,
        mode: "monitoring",
        jobStatus: "complete",
        name: "default",
      },
      {
        projectId: project.id,
        mode: "ci",
        jobStatus: "complete",
        name: "default",
      },
      {
        projectId: project.id,
        mode: "monitoring",
        jobStatus: "complete",
        name: "other",
      },
      {
        projectId: project.id,
        mode: "monitoring",
        jobStatus: "complete",
        name: "default",
      },
      // The source build
      {
        projectId: project.id,
        mode: "monitoring",
        jobStatus: "complete",
        name: "default",
      },
    ]);
    await Promise.all(
      [
        firstApproved,
        lastApproved,
        approvedWithOtherName,
        approvedWithOtherMode,
      ].map((build) =>
        factory.BuildReview.create({
          buildId: build!.id,
          state: "approved",
        }),
      ),
    );
    await factory.BuildReview.create({
      buildId: nonApproved!.id,
      state: "rejected",
    });
    sourceBuild = source!;
    matchedBuild = lastApproved!;
  });

  it("picks the latest approved builds of the same name", async () => {
    const ctx = await MonitoringStrategy.getContext(sourceBuild);
    const { baseScreenshotBucket } = await MonitoringStrategy.getBase(
      sourceBuild,
      ctx,
    );
    expect(baseScreenshotBucket!.id).toBe(
      matchedBuild.compareScreenshotBucketId,
    );
  });
});
