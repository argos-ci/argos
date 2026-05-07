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
    conclusion: "no-changes",
    updatedAt: input.updatedAt,
  });
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
});
