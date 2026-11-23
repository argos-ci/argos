import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import { DeploymentAlias, ProjectDomain } from "@/database/models";
import type { Deployment, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { finalizeDeployment } from "./finalizeDeployment";

const app = createTestHandlerApp(finalizeDeployment);

/**
 * A project in another account, with a token and a pending preview deployment.
 */
async function createOtherDeployment(input: {
  accountSlug: string;
  branch: string;
}) {
  const account = await factory.TeamAccount.create({ slug: input.accountSlug });
  const project = await factory.Project.create({
    accountId: account.id,
    name: "docs",
  });
  await factory.createProjectToken({
    projects: [project],
    token: "the-other-token",
  });
  return factory.Deployment.create({
    projectId: project.id,
    status: "pending",
    environment: "preview",
    branch: input.branch,
    slug: "other-deployment-slug",
  });
}

const test = base.extend<{
  project: Project;
  deployment: Deployment;
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
    await factory.createProjectToken({
      projects: [project],
      token: "the-awesome-token",
    });
    await use(project);
  },
  deployment: async ({ project }, use) => {
    const deployment = await factory.Deployment.create({
      projectId: project.id,
      status: "pending",
      environment: "production",
      branch: "main",
      slug: "deployment-slug",
    });
    await use(deployment);
  },
});

describe("finalizeDeployment", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("creates an internal project domain and aliases it for production deployments", async ({
    deployment,
  }) => {
    await request(app)
      .post(`/deployments/${deployment.id}/finalize`)
      .set("Authorization", "Bearer the-awesome-token")
      .expect(200);

    await expect(
      ProjectDomain.query().findOne({
        projectId: deployment.projectId,
        environment: "production",
        internal: true,
      }),
    ).resolves.toMatchObject({
      domain: "docs.dev.argos-ci.live",
    });

    const aliases = await DeploymentAlias.query()
      .where("deploymentId", deployment.id)
      .orderBy("alias", "asc");

    expect(aliases.map((alias) => alias.alias)).toEqual([
      "docs-main-awesome-team",
      "docs.dev.argos-ci.live",
    ]);
  });

  test("reuses the existing internal project domain for production deployments", async ({
    deployment,
  }) => {
    await factory.ProjectDomain.create({
      projectId: deployment.projectId,
      domain: "custom.dev.argos-ci.live",
      environment: "production",
      internal: true,
    });

    await request(app)
      .post(`/deployments/${deployment.id}/finalize`)
      .set("Authorization", "Bearer the-awesome-token")
      .expect(200);

    await expect(
      ProjectDomain.query()
        .where("projectId", deployment.projectId)
        .where("environment", "production")
        .where("internal", true),
    ).resolves.toHaveLength(1);

    await expect(
      DeploymentAlias.query().findOne({
        deploymentId: deployment.id,
        alias: "custom.dev.argos-ci.live",
      }),
    ).resolves.toBeTruthy();
  });

  test("moves the branch alias to the project's newer deployment", async ({
    project,
    deployment,
  }) => {
    const previous = await factory.Deployment.create({
      projectId: project.id,
      status: "ready",
      environment: "preview",
      branch: "main",
      slug: "previous-slug",
    });
    await factory.DeploymentAlias.create({
      deploymentId: previous.id,
      alias: "docs-main-awesome-team",
      type: "branch",
    });

    await request(app)
      .post(`/deployments/${deployment.id}/finalize`)
      .set("Authorization", "Bearer the-awesome-token")
      .expect(200);

    await expect(
      DeploymentAlias.query().findOne({ alias: "docs-main-awesome-team" }),
    ).resolves.toMatchObject({ deploymentId: deployment.id });
  });

  test("leaves a branch alias with the project that holds it", async ({
    project,
  }) => {
    const holder = await factory.Deployment.create({
      projectId: project.id,
      status: "ready",
      environment: "preview",
      branch: "main",
      slug: "holder-slug",
    });
    await factory.DeploymentAlias.create({
      deploymentId: holder.id,
      alias: "docs-main-awesome-team",
      type: "branch",
    });
    // "docs" + "_" + "main-awesome-team" slugifies to the holder's alias.
    const other = await createOtherDeployment({
      accountSlug: "main-awesome-team",
      branch: "_",
    });

    await request(app)
      .post(`/deployments/${other.id}/finalize`)
      .set("Authorization", "Bearer the-other-token")
      .expect(200);

    await expect(
      DeploymentAlias.query().findOne({ alias: "docs-main-awesome-team" }),
    ).resolves.toMatchObject({ deploymentId: holder.id });
    await expect(
      DeploymentAlias.query().where({ deploymentId: other.id }),
    ).resolves.toEqual([]);
  });

  test("does not alias a branch on another project's deployment slug", async ({
    project,
  }) => {
    await factory.Deployment.create({
      projectId: project.id,
      status: "ready",
      environment: "preview",
      branch: "main",
      slug: "docs-k3j2h1g9f-awesome-team",
    });
    const other = await createOtherDeployment({
      accountSlug: "k3j2h1g9f-awesome-team",
      branch: "_",
    });

    await request(app)
      .post(`/deployments/${other.id}/finalize`)
      .set("Authorization", "Bearer the-other-token")
      .expect(200);

    await expect(
      DeploymentAlias.query().findOne({
        alias: "docs-k3j2h1g9f-awesome-team",
      }),
    ).resolves.toBeUndefined();
  });
});
