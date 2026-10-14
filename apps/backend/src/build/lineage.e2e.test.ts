import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import type { Build, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getNewerBuild } from "./lineage";

const BRANCH = "feat/sparkle";

/**
 * A build of the project, `minutesAgo` minutes old, with its own compare bucket.
 */
async function createBuild(input: {
  projectId: string;
  minutesAgo: number;
  name?: string;
  branch?: string;
  type?: Build["type"];
}): Promise<Build> {
  const name = input.name ?? "default";
  const bucket = await factory.ScreenshotBucket.create({
    projectId: input.projectId,
    name,
    branch: input.branch ?? BRANCH,
  });
  return factory.Build.create({
    projectId: input.projectId,
    name,
    compareScreenshotBucketId: bucket.id,
    conclusion: "changes-detected",
    type: input.type ?? "check",
    createdAt: new Date(Date.now() - input.minutesAgo * 60_000).toISOString(),
  });
}

async function getNewerBuildOf(build: Build) {
  await build.$fetchGraph("compareScreenshotBucket");
  invariant(build.compareScreenshotBucket);
  return getNewerBuild({
    build,
    compareBucket: build.compareScreenshotBucket,
  });
}

const test = it.extend<{ project: Project }>({
  project: async ({}, use) => {
    await use(await factory.Project.create());
  },
});

describe("getNewerBuild", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  test("returns the latest build of the suite on the branch", async ({
    project,
  }) => {
    const build = await createBuild({ projectId: project.id, minutesAgo: 30 });
    await createBuild({ projectId: project.id, minutesAgo: 20 });
    const latest = await createBuild({ projectId: project.id, minutesAgo: 10 });

    const newerBuild = await getNewerBuildOf(build);
    expect(newerBuild?.id).toBe(latest.id);
  });

  test("returns nothing for the latest build itself", async ({ project }) => {
    await createBuild({ projectId: project.id, minutesAgo: 30 });
    const latest = await createBuild({ projectId: project.id, minutesAgo: 10 });

    expect(await getNewerBuildOf(latest)).toBeNull();
  });

  test("ignores other suites and other branches", async ({ project }) => {
    const build = await createBuild({ projectId: project.id, minutesAgo: 30 });
    await createBuild({
      projectId: project.id,
      minutesAgo: 10,
      name: "storybook",
    });
    await createBuild({
      projectId: project.id,
      minutesAgo: 10,
      branch: "feat/other",
    });

    expect(await getNewerBuildOf(build)).toBeNull();
  });

  test("returns nothing for a reference build", async ({ project }) => {
    const build = await createBuild({
      projectId: project.id,
      minutesAgo: 30,
      branch: "main",
      type: "reference",
    });
    await createBuild({
      projectId: project.id,
      minutesAgo: 10,
      branch: "main",
      type: "reference",
    });

    expect(await getNewerBuildOf(build)).toBeNull();
  });
});
