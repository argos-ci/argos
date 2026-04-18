import request from "supertest";
import {
  test as base,
  beforeAll,
  beforeEach,
  describe,
  expect,
  vi,
} from "vitest";
import z from "zod";

import { DeploymentAlias, ProjectDomain } from "@/database/models";
import type { Deployment, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { finalizeDeployment } from "./finalizeDeployment";

const { dynamoSendMock } = vi.hoisted(() => ({
  dynamoSendMock: vi.fn(),
}));

vi.mock("@/storage/dynamodb", () => ({
  getDynamoDBClient: () => ({
    send: dynamoSendMock,
  }),
  getTableName: (name: string) => name,
}));

vi.mock("@/deployment/invalidate", () => ({
  invalidateDeploymentCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/deployment/github-status", () => ({
  postDeploymentCommitStatus: vi.fn().mockResolvedValue(undefined),
}));

const app = createTestHandlerApp(finalizeDeployment);

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
      token: "the-awesome-token",
      accountId: account.id,
      name: "docs",
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

  beforeEach(() => {
    dynamoSendMock.mockReset();
    dynamoSendMock.mockResolvedValue({
      Items: [],
      LastEvaluatedKey: undefined,
    });
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
});
