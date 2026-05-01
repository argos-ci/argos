import { test as base, describe, expect } from "vitest";

import type { Deployment, DeploymentAlias } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  getDeploymentAliasCandidates,
  resolveDeploymentByDomain,
} from "./resolve";

const test = base.extend<{
  deployment: Deployment;
  deploymentAlias: DeploymentAlias;
}>({
  deployment: async ({}, use) => {
    await setupDatabase();
    const deployment = await factory.Deployment.create({
      slug: "deployment-main",
      environment: "production",
    });
    await use(deployment);
  },
  deploymentAlias: async ({ deployment }, use) => {
    const deploymentAlias = await factory.DeploymentAlias.create({
      deploymentId: deployment.id,
      alias: "preview-alias",
    });
    await use(deploymentAlias);
  },
});

describe("getDeploymentAliasCandidates", () => {
  test("normalizes deployment URLs to hostname and internal alias candidates", () => {
    expect(
      getDeploymentAliasCandidates(
        " HTTPS://Preview-Alias.dev.argos-ci.live/path?tab=logs#details ",
      ),
    ).toEqual(["preview-alias.dev.argos-ci.live", "preview-alias"]);
  });

  test("returns no candidates for invalid URLs", () => {
    expect(getDeploymentAliasCandidates("https://")).toEqual([]);
  });
});

describe("resolveDeploymentByDomain", () => {
  test("resolves a branch alias from a deployment hostname", async ({
    deployment,
    deploymentAlias,
  }) => {
    const result = await resolveDeploymentByDomain(
      "preview-alias.dev.argos-ci.live",
    );

    expect(result).toMatchObject({
      id: deploymentAlias.deploymentId,
      projectId: deployment.projectId,
      environment: deployment.environment,
    });
  });

  test("resolves a deployment slug from a deployment URL", async ({
    deployment,
  }) => {
    const result = await resolveDeploymentByDomain(
      "https://deployment-main.dev.argos-ci.live/snapshots?name=home",
    );

    expect(result).toMatchObject({
      id: deployment.id,
      projectId: deployment.projectId,
      environment: deployment.environment,
    });
  });

  test("returns null when the input cannot produce alias candidates", async () => {
    await setupDatabase();

    await expect(resolveDeploymentByDomain(" ")).resolves.toBeNull();
  });
});
