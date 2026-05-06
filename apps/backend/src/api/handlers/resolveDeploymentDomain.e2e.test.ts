import request from "supertest";
import { test as base, describe, expect } from "vitest";

import type { Deployment, DeploymentAlias } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { resolveDeploymentDomain } from "./resolveDeploymentDomain";

const app = createTestHandlerApp(resolveDeploymentDomain);

const test = base.extend<{
  deployment: Deployment;
  prodDeployment: Deployment;
  deploymentAlias: DeploymentAlias;
  factory: typeof factory;
}>({
  factory: async ({}, use) => {
    await setupDatabase();
    await use(factory);
  },
  deployment: async ({ factory }, use) => {
    const deployment = await factory.Deployment.create();
    await use(deployment);
  },
  prodDeployment: async ({ factory }, use) => {
    const deployment = await factory.Deployment.create({
      environment: "production",
    });
    await use(deployment);
  },
  deploymentAlias: async ({ deployment, factory }, use) => {
    const deploymentAlias = await factory.DeploymentAlias.create({
      deploymentId: deployment.id,
      alias: "preview-alias",
    });
    await use(deploymentAlias);
  },
});

describe("resolveDeploymentDomain", () => {
  test("resolves a deployment alias from a hostname", async ({
    deployment,
    deploymentAlias,
  }) => {
    await request(app)
      .get("/deployments/resolve/preview-alias.dev.argos-ci.live")
      .expect(200)
      .expect((res) => {
        expect(res.headers["cache-control"]).toBe(
          "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
        );
        expect(res.body).toEqual({
          deploymentId: deploymentAlias.deploymentId,
          projectId: deployment.projectId,
          environment: deployment.environment,
          visibility: "private",
        });
      });
  });

  test("resolves a full domain alias", async ({ prodDeployment }) => {
    await factory.DeploymentAlias.create({
      deploymentId: prodDeployment.id,
      alias: "docs.dev.argos-ci.live",
      type: "domain",
    });

    await request(app)
      .get("/deployments/resolve/docs.dev.argos-ci.live")
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          deploymentId: prodDeployment.id,
          projectId: prodDeployment.projectId,
          environment: prodDeployment.environment,
          visibility: "public",
        });
      });
  });

  test("resolves a full domain alias from a URL", async ({ deployment }) => {
    await factory.DeploymentAlias.create({
      deploymentId: deployment.id,
      alias: "docs.dev.argos-ci.live",
    });

    await request(app)
      .get("/deployments/resolve/https%3A%2F%2Fdocs.dev.argos-ci.live%2Fpath")
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          deploymentId: deployment.id,
          projectId: deployment.projectId,
          environment: deployment.environment,
          visibility: "private",
        });
      });
  });

  test("resolves a deployment slug from a hostname", async ({ deployment }) => {
    await request(app)
      .get(`/deployments/resolve/${deployment.slug}.dev.argos-ci.live`)
      .expect(200)
      .expect((res) => {
        expect(res.headers["cache-control"]).toBe(
          "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
        );
        expect(res.body).toEqual({
          deploymentId: deployment.id,
          projectId: deployment.projectId,
          environment: deployment.environment,
          visibility: "private",
        });
      });
  });

  test("returns 404 when the domain is unknown", async () => {
    await request(app)
      .get("/deployments/resolve/unknown.dev.argos-ci.live")
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Deployment domain not found");
      });
  });

  test("returns 404 when deployments are disabled on the project", async ({
    factory,
  }) => {
    const project = await factory.Project.create({
      deploymentEnabled: false,
    });
    const deployment = await factory.Deployment.create({
      projectId: project.id,
    });
    await factory.DeploymentAlias.create({
      deploymentId: deployment.id,
      alias: "disabled-preview",
    });

    await request(app)
      .get("/deployments/resolve/disabled-preview.dev.argos-ci.live")
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Deployment domain not found");
      });
  });
});
