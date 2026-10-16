import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import type { Build, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getNewerBuild } from "./lineage";

const BRANCH = "feat/sparkle";
const COMMIT_A = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0";
const COMMIT_B = "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1";

/**
 * A build of the project, `minutesAgo` minutes old, with its own compare bucket.
 */
async function createBuild(input: {
  projectId: string;
  minutesAgo: number;
  name?: string;
  branch?: string;
  commit?: string;
  type?: Build["type"];
}): Promise<Build> {
  const name = input.name ?? "default";
  const bucket = await factory.ScreenshotBucket.create({
    projectId: input.projectId,
    name,
    branch: input.branch ?? BRANCH,
    ...(input.commit ? { commit: input.commit } : {}),
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

  test("points a re-run of the same commit to its latest run", async ({
    project,
  }) => {
    const build = await createBuild({
      projectId: project.id,
      minutesAgo: 30,
      commit: COMMIT_B,
    });
    const rerun = await createBuild({
      projectId: project.id,
      minutesAgo: 10,
      commit: COMMIT_B,
    });

    const newerBuild = await getNewerBuildOf(build);
    expect(newerBuild?.id).toBe(rerun.id);
  });

  test("ignores a re-run of an older commit", async ({ project }) => {
    const first = await createBuild({
      projectId: project.id,
      minutesAgo: 30,
      commit: COMMIT_A,
    });
    const head = await createBuild({
      projectId: project.id,
      minutesAgo: 20,
      commit: COMMIT_B,
    });
    // CI ran the workflow of the first commit again, after the second one.
    const rerunOfFirst = await createBuild({
      projectId: project.id,
      minutesAgo: 10,
      commit: COMMIT_A,
    });

    expect(await getNewerBuildOf(head)).toBeNull();
    expect((await getNewerBuildOf(first))?.id).toBe(head.id);
    expect((await getNewerBuildOf(rerunOfFirst))?.id).toBe(head.id);
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
