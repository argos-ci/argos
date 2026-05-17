import { test as base, describe, expect } from "vitest";

import type {
  Build,
  BuildNotification,
  Project,
  ScreenshotBucket,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import type { SendNotificationContext } from "./context";
import { getBuildRepositoryDispatch } from "./repository-dispatch";

const test = base.extend<{
  project: Project;
  bucket: ScreenshotBucket;
  build: Build;
  buildNotification: BuildNotification;
}>({
  project: async ({}, use) => {
    await setupDatabase();
    const project = await factory.Project.create({ name: "awesome-project" });
    await use(project);
  },
  bucket: async ({ project }, use) => {
    const bucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      branch: "feature/x",
    });
    await use(bucket);
  },
  build: async ({ project, bucket }, use) => {
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: bucket.id,
      name: "default",
      baseCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      baseBranch: "main",
      prNumber: 42,
      prHeadCommit: "cccccccccccccccccccccccccccccccccccccccc",
    });
    await use(build);
  },
  buildNotification: async ({ build }, use) => {
    const buildNotification = await factory.BuildNotification.create({
      buildId: build.id,
      type: "diff-detected",
    });
    await use(buildNotification);
  },
});

describe("#getBuildRepositoryDispatch", () => {
  test("returns the dispatch payload", async ({
    project,
    bucket,
    build,
    buildNotification,
  }) => {
    const ctx: SendNotificationContext = {
      buildNotification,
      build: Object.assign(build, {
        project,
        compareScreenshotBucket: bucket,
      }),
      commit: bucket.commit,
      buildUrl: "https://app.argos-ci.com/team/awesome-project/builds/1",
      projectUrl: "https://app.argos-ci.com/team/awesome-project",
      notification: {
        description: "Diff detected",
        context: "argos",
        github: { state: "failure" },
        gitlab: { state: "failed" },
      },
      aggregatedNotification: null,
      comment: true,
    };

    const dispatch = await getBuildRepositoryDispatch(ctx);

    expect(dispatch).toEqual({
      event_type: "argos.build.diff-detected",
      client_payload: {
        argos: {
          type: "build",
          action: "diff-detected",
          build: {
            id: build.id,
            number: build.number,
            name: "default",
            type: build.type,
            status: "diff-detected",
            conclusion: build.conclusion,
            url: "https://app.argos-ci.com/team/awesome-project/builds/1",
            commit: bucket.commit,
            branch: "feature/x",
            baseCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            baseBranch: "main",
            prNumber: 42,
            prHeadCommit: "cccccccccccccccccccccccccccccccccccccccc",
          },
          project: {
            id: project.id,
            name: "awesome-project",
            url: "https://app.argos-ci.com/team/awesome-project",
          },
        },
      },
    });
  });
});
