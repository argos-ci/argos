import { invariant } from "@argos/util/invariant";
import { test as base, describe, expect } from "vitest";

import type { Build, Deployment, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getCommentBody } from "./comment";

const commit = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const test = base.extend<{
  project: Project;
}>({
  project: async ({}, use) => {
    await setupDatabase();
    const account = await factory.TeamAccount.create({
      slug: "awesome-team",
    });
    const project = await factory.Project.create({
      accountId: account.id,
      name: "docs",
    });
    await use(project);
  },
});

async function createBuild(input: {
  projectId: string;
  name?: string;
  updatedAt?: string;
  conclusion?: Build["conclusion"];
}): Promise<Build> {
  const compareBucket = await factory.ScreenshotBucket.create({
    projectId: input.projectId,
    commit,
  });
  return factory.Build.create({
    projectId: input.projectId,
    compareScreenshotBucketId: compareBucket.id,
    name: input.name ?? "default",
    jobStatus: "complete",
    conclusion: input.conclusion ?? "no-changes",
    updatedAt: input.updatedAt,
  });
}

/**
 * Create a user with an account named `name`, so their reviews show a display
 * name in the PR comment.
 */
async function createReviewer(name: string) {
  const user = await factory.User.create();
  await factory.UserAccount.create({ userId: user.id, name });
  return user;
}

async function createDeployment(input: {
  projectId: string;
  slug: string;
  status?: Deployment["status"];
  environment?: Deployment["environment"];
  createdAt?: string;
  updatedAt?: string;
}): Promise<Deployment> {
  return factory.Deployment.create({
    projectId: input.projectId,
    commitSha: commit,
    slug: input.slug,
    status: input.status ?? "ready",
    environment: input.environment ?? "preview",
    branch: "feature/comment",
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  });
}

describe("getCommentBody", () => {
  test("renders build and deployment rows for a commit", async ({
    project,
  }) => {
    const build = await createBuild({
      projectId: project.id,
      updatedAt: "2026-05-07T12:00:00.000Z",
    });
    const deployment = await createDeployment({
      projectId: project.id,
      slug: "deployment-comment",
      updatedAt: "2026-05-07T12:05:00.000Z",
    });

    const buildUrl = await build.getUrl();
    const body = await getCommentBody({ commit });

    expect(body).toContain("| Build | Status | Details | Updated (UTC) |");
    expect(body).toContain(
      `| **default** ([Inspect](${buildUrl})) | ✅ No changes detected | - | May 7, 2026, 12:00 PM |`,
    );
    expect(body).toContain("| Deployment | Status | Branch | Updated (UTC) |");
    expect(body).toContain(
      `| **preview** ([Open](${deployment.url})) | Ready | feature/comment | May 7, 2026, 12:05 PM |`,
    );
  });

  test("renders deployment rows without builds", async ({ project }) => {
    const deployment = await createDeployment({
      projectId: project.id,
      slug: "deployment-only",
      status: "pending",
    });

    const body = await getCommentBody({ commit });

    expect(body).not.toContain("| Build | Status | Details | Updated (UTC) |");
    expect(body).toContain(
      `| **preview** ([Open](${deployment.url})) | Deploying | feature/comment |`,
    );
  });

  test("uses the latest deployment per project and environment", async ({
    project,
  }) => {
    const olderDeployment = await createDeployment({
      projectId: project.id,
      slug: "older-deployment",
      createdAt: "2026-05-07T12:00:00.000Z",
      updatedAt: "2026-05-07T12:00:00.000Z",
    });
    const latestDeployment = await createDeployment({
      projectId: project.id,
      slug: "latest-deployment",
      status: "pending",
      createdAt: "2026-05-07T12:10:00.000Z",
      updatedAt: "2026-05-07T12:10:00.000Z",
    });

    const body = await getCommentBody({ commit });

    expect(body).toContain(latestDeployment.url);
    expect(body).toContain("Deploying");
    expect(body).not.toContain(olderDeployment.url);
  });

  test("shows ignored screenshots in the build details column", async ({
    project,
  }) => {
    const compareBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      commit,
    });
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareBucket.id,
      name: "default",
      jobStatus: "complete",
      conclusion: "no-changes",
      updatedAt: "2026-05-07T12:00:00.000Z",
      stats: {
        failure: 0,
        added: 0,
        unchanged: 0,
        changed: 4,
        removed: 0,
        total: 7,
        retryFailure: 0,
        ignored: 3,
      },
    });

    const buildUrl = await build.getUrl();
    const body = await getCommentBody({ commit });

    expect(body).toContain(
      `| **default** ([Inspect](${buildUrl})) | ✅ No changes detected | 4 changed, 3 ignored | May 7, 2026, 12:00 PM |`,
    );
  });

  test("prefixes rows when multiple projects share the commit", async ({
    project,
  }) => {
    const otherProject = await factory.Project.create({
      name: "app",
    });
    await createBuild({ projectId: project.id });
    await createDeployment({
      projectId: otherProject.id,
      slug: "other-project-deployment",
      environment: "production",
    });

    const body = await getCommentBody({ commit });

    invariant(project.name, "project name should exist");
    expect(body).toContain(`| **${project.name}/default**`);
    expect(body).toContain(`| **${otherProject.name}/production**`);
  });

  test("shows the reviewers and comment count for an approved build", async ({
    project,
  }) => {
    const [build, alice, bob] = await Promise.all([
      createBuild({
        projectId: project.id,
        conclusion: "changes-detected",
        updatedAt: "2026-05-07T12:00:00.000Z",
      }),
      createReviewer("Alice"),
      createReviewer("Bob"),
    ]);
    await factory.BuildReview.createMany(2, [
      { buildId: build.id, userId: alice.id, state: "approved" },
      { buildId: build.id, userId: bob.id, state: "approved" },
    ]);
    const rootComment = await factory.Comment.create({
      buildId: build.id,
      userId: alice.id,
    });
    await factory.Comment.createMany(2, [
      { buildId: build.id, userId: bob.id },
      // A reply must not inflate the count.
      { buildId: build.id, userId: bob.id, threadId: rootComment.id },
    ]);

    const buildUrl = await build.getUrl();
    const body = await getCommentBody({ commit });

    expect(body).toContain(
      `| **default** ([Inspect](${buildUrl})) | 👍 Approved by Alice and Bob (2 comments) | - | May 7, 2026, 12:00 PM |`,
    );
  });

  test("shows the reviewer who rejected a build", async ({ project }) => {
    const [build, carol] = await Promise.all([
      createBuild({
        projectId: project.id,
        conclusion: "changes-detected",
        updatedAt: "2026-05-07T12:00:00.000Z",
      }),
      createReviewer("Carol"),
    ]);
    await factory.BuildReview.create({
      buildId: build.id,
      userId: carol.id,
      state: "rejected",
    });

    const buildUrl = await build.getUrl();
    const body = await getCommentBody({ commit });

    expect(body).toContain(
      `| **default** ([Inspect](${buildUrl})) | 👎 Rejected by Carol | - | May 7, 2026, 12:00 PM |`,
    );
  });

  test("ignores dismissed reviews when listing reviewers", async ({
    project,
  }) => {
    const [build, alice, bob] = await Promise.all([
      createBuild({
        projectId: project.id,
        conclusion: "changes-detected",
        updatedAt: "2026-05-07T12:00:00.000Z",
      }),
      createReviewer("Alice"),
      createReviewer("Bob"),
    ]);
    await factory.BuildReview.createMany(2, [
      {
        buildId: build.id,
        userId: alice.id,
        state: "approved",
        dismissedAt: "2026-05-07T12:30:00.000Z",
        dismissedById: bob.id,
      },
      { buildId: build.id, userId: bob.id, state: "approved" },
    ]);

    const buildUrl = await build.getUrl();
    const body = await getCommentBody({ commit });

    expect(body).toContain(
      `| **default** ([Inspect](${buildUrl})) | 👍 Approved by Bob | - | May 7, 2026, 12:00 PM |`,
    );
  });
});
