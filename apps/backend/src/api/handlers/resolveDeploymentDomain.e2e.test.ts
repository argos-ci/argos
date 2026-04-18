import request from "supertest";
import { test as base, describe, expect } from "vitest";

import type { Deployment, DeploymentAlias } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { resolveDeploymentDomain } from "./resolveDeploymentDomain";

const app = createTestHandlerApp(resolveDeploymentDomain);

const test = base.extend<{
  deployment: Deployment;
  deploymentAlias: DeploymentAlias;
}>({
  deployment: async ({}, use) => {
    await setupDatabase();
    const deployment = await factory.Deployment.create();
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

describe("resolveDeploymentDomain", () => {
  test("resolves a deployment alias from a hostname", async ({
    deploymentAlias,
  }) => {
    await request(app)
      .get("/deployments/resolve/preview-alias.dev.argos-ci.live")
      .expect(200)
      .expect((res) => {
        expect(res.headers["cache-control"]).toBe(
          "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
        );
        expect(res.body).toEqual({
          deploymentId: deploymentAlias.deploymentId,
        });
      });
  });

  test("resolves a full domain alias", async ({ deployment }) => {
    await factory.DeploymentAlias.create({
      deploymentId: deployment.id,
      alias: "docs.dev.argos-ci.live",
    });

    await request(app)
      .get("/deployments/resolve/docs.dev.argos-ci.live")
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          deploymentId: deployment.id,
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
        });
      });
  });

  test("resolves a deployment slug from a hostname", async ({ deployment }) => {
    await request(app)
      .get(`/deployments/resolve/${deployment.slug}.dev.argos-ci.live`)
      .expect(200)
      .expect((res) => {
        expect(res.headers["cache-control"]).toBe(
          "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
        );
        expect(res.body).toEqual({
          deploymentId: deployment.id,
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
});
