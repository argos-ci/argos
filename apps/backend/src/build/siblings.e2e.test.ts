import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import type {
  Account,
  Build,
  Project,
  ScreenshotBucket,
  User,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getSiblingBuilds } from "./siblings";

const BRANCH = "feat/sparkle";
const COMMIT = "c2b8b5b2f6a1d4e3c0b9f8a7d6e5c4b3a2f1e0d9";

/**
 * A build of the commit under test, in the given project.
 */
async function createCommitBuild(input: {
  projectId: string;
  name: string;
  branch?: string;
  commit?: string;
  prHeadCommit?: string;
}): Promise<Build> {
  const bucket = await factory.ScreenshotBucket.create({
    projectId: input.projectId,
    name: input.name,
    branch: input.branch ?? BRANCH,
    commit: input.commit ?? COMMIT,
  });
  return factory.Build.create({
    projectId: input.projectId,
    name: input.name,
    compareScreenshotBucketId: bucket.id,
    conclusion: "changes-detected",
    prHeadCommit: input.prHeadCommit ?? null,
  });
}

async function getCompareBucket(build: Build): Promise<ScreenshotBucket> {
  await build.$fetchGraph("compareScreenshotBucket");
  const bucket = build.compareScreenshotBucket;
  invariant(bucket);
  return bucket;
}

const test = it.extend<{
  /** A member of the team owning `project` and `siblingProject`. */
  user: User;
  teamAccount: Account;
  project: Project;
  /** Another project of the same team, so of the same member. */
  siblingProject: Project;
  /** A project of a team the user has nothing to do with. */
  foreignProject: Project;
  build: Build;
}>({
  user: async ({}, use) => {
    await use(await factory.User.create());
  },
  teamAccount: async ({ user }, use) => {
    const account = await factory.TeamAccount.create();
    invariant(account.teamId);
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel: "member",
    });
    await use(account);
  },
  project: async ({ teamAccount }, use) => {
    await use(
      await factory.Project.create({
        accountId: teamAccount.id,
        name: "sparkle",
      }),
    );
  },
  siblingProject: async ({ teamAccount }, use) => {
    await use(
      await factory.Project.create({
        accountId: teamAccount.id,
        name: "sparkle-docs",
      }),
    );
  },
  foreignProject: async ({}, use) => {
    await use(await factory.Project.create({ name: "not-yours" }));
  },
  build: async ({ project }, use) => {
    await use(
      await createCommitBuild({ projectId: project.id, name: "default" }),
    );
  },
});

describe("getSiblingBuilds", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  test("returns the commit's other suites in the same project", async ({
    user,
    project,
    build,
  }) => {
    const storybookBuild = await createCommitBuild({
      projectId: project.id,
      name: "storybook",
    });

    const siblings = await getSiblingBuilds({
      build,
      compareBucket: await getCompareBucket(build),
      user,
    });
    expect(siblings.map((sibling) => sibling.id)).toEqual([storybookBuild.id]);
  });

  test("returns the commit's builds in another project of the viewer", async ({
    user,
    siblingProject,
    build,
  }) => {
    // Same build name as the reviewed one: two projects of a monorepo both
    // call their suite `default`, so the name cannot be what excludes a build.
    const docsBuild = await createCommitBuild({
      projectId: siblingProject.id,
      name: "default",
    });

    const siblings = await getSiblingBuilds({
      build,
      compareBucket: await getCompareBucket(build),
      user,
    });
    expect(siblings.map((sibling) => sibling.id)).toEqual([docsBuild.id]);
  });

  test("matches the head commit of a pull request build", async ({
    user,
    project,
    siblingProject,
  }) => {
    // A pull request build is checked out on the merge commit, so the two
    // projects only agree on the head commit — and each carries it on
    // `prHeadCommit` rather than on its bucket.
    const build = await createCommitBuild({
      projectId: project.id,
      name: "default",
      commit: "1111111111111111111111111111111111111111",
      prHeadCommit: COMMIT,
    });
    const docsBuild = await createCommitBuild({
      projectId: siblingProject.id,
      name: "default",
      commit: "2222222222222222222222222222222222222222",
      prHeadCommit: COMMIT,
    });

    const siblings = await getSiblingBuilds({
      build,
      compareBucket: await getCompareBucket(build),
      user,
    });
    expect(siblings.map((sibling) => sibling.id)).toEqual([docsBuild.id]);
  });

  test("keeps only the latest run of a suite", async ({
    user,
    siblingProject,
    build,
  }) => {
    await createCommitBuild({ projectId: siblingProject.id, name: "default" });
    const rerun = await createCommitBuild({
      projectId: siblingProject.id,
      name: "default",
    });

    const siblings = await getSiblingBuilds({
      build,
      compareBucket: await getCompareBucket(build),
      user,
    });
    expect(siblings.map((sibling) => sibling.id)).toEqual([rerun.id]);
  });

  test("ignores the commit's builds in a project the viewer is not a member of", async ({
    user,
    foreignProject,
    build,
  }) => {
    await createCommitBuild({ projectId: foreignProject.id, name: "default" });

    const siblings = await getSiblingBuilds({
      build,
      compareBucket: await getCompareBucket(build),
      user,
    });
    expect(siblings).toEqual([]);
  });

  test("ignores a public project the viewer is not a member of", async ({
    user,
    foreignProject,
    build,
  }) => {
    // A commit SHA travels far enough that a build hung off someone else's
    // commit must not be offered as the next thing to review, public or not.
    await foreignProject.$query().patch({ private: false });
    await createCommitBuild({ projectId: foreignProject.id, name: "default" });

    const siblings = await getSiblingBuilds({
      build,
      compareBucket: await getCompareBucket(build),
      user,
    });
    expect(siblings).toEqual([]);
  });

  test("returns nothing outside the build's own project for an anonymous viewer", async ({
    project,
    siblingProject,
    build,
  }) => {
    const storybookBuild = await createCommitBuild({
      projectId: project.id,
      name: "storybook",
    });
    await createCommitBuild({ projectId: siblingProject.id, name: "default" });

    const siblings = await getSiblingBuilds({
      build,
      compareBucket: await getCompareBucket(build),
      user: null,
    });
    expect(siblings.map((sibling) => sibling.id)).toEqual([storybookBuild.id]);
  });

  test("ignores the commit's builds on another branch", async ({
    user,
    siblingProject,
    build,
  }) => {
    await createCommitBuild({
      projectId: siblingProject.id,
      name: "default",
      branch: "main",
    });

    const siblings = await getSiblingBuilds({
      build,
      compareBucket: await getCompareBucket(build),
      user,
    });
    expect(siblings).toEqual([]);
  });

  test("lists this project's builds before the other projects'", async ({
    user,
    project,
    siblingProject,
    build,
  }) => {
    const docsBuild = await createCommitBuild({
      projectId: siblingProject.id,
      name: "default",
    });
    const storybookBuild = await createCommitBuild({
      projectId: project.id,
      name: "storybook",
    });

    const siblings = await getSiblingBuilds({
      build,
      compareBucket: await getCompareBucket(build),
      user,
    });
    expect(siblings.map((sibling) => sibling.id)).toEqual([
      storybookBuild.id,
      docsBuild.id,
    ]);
  });
});
