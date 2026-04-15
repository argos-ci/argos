import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import type { Account, Deployment, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { getDeployment } from "./getDeployment";

const app = createTestHandlerApp(getDeployment);

const test = base.extend<{
  account: Account;
  project: Project;
  deployment: Deployment;
}>({
  account: async ({}, use) => {
    await setupDatabase();
    const account = await factory.TeamAccount.create({ slug: "acme" });
    await use(account);
  },
  project: async ({ account }, use) => {
    const project = await factory.Project.create({
      accountId: account.id,
      name: "web",
      token: "the-awesome-token",
    });
    await use(project);
  },
  deployment: async ({ project }, use) => {
    const deployment = await factory.Deployment.create({
      projectId: project.id,
      status: "ready",
      environment: "preview",
      branch: "main",
      commitSha: "a".repeat(40),
      slug: "web-preview-acme",
    });
    await use(deployment);
  },
});

describe("getDeployment", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  describe("without a valid token", () => {
    test("returns 401 status code", async ({ deployment }) => {
      await request(app)
        .get(`/deployments/${deployment.id}`)
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.body.error).toBe(
            `Project not found in Argos. If the issue persists, verify your token. (token: "invalid-token").`,
          );
        })
        .expect(401);
    });
  });

  test("returns a deployment for a project token", async ({ deployment }) => {
    await request(app)
      .get(`/deployments/${deployment.id}`)
      .set("Authorization", "Bearer the-awesome-token")
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          id: deployment.id,
          status: "ready",
          environment: "preview",
          branch: "main",
          commitSha: "a".repeat(40),
          url: "https://web-preview-acme.dev.argos-ci.live/",
          createdAt: new Date(deployment.createdAt).toISOString(),
        });
      });
  });

  test("returns 404 when the deployment does not exist", async () => {
    await request(app)
      .get("/deployments/999999")
      .set("Authorization", "Bearer the-awesome-token")
      .expect((res) => {
        expect(res.body.error).toBe("Deployment not found");
      })
      .expect(404);
  });

  test("returns 401 when a project token accesses another project deployment", async ({
    account,
    project: _project,
  }) => {
    const otherProject = await factory.Project.create({
      accountId: account.id,
      name: "docs",
    });
    const otherDeployment = await factory.Deployment.create({
      projectId: otherProject.id,
      slug: "docs-preview-acme",
    });

    await request(app)
      .get(`/deployments/${otherDeployment.id}`)
      .set("Authorization", "Bearer the-awesome-token")
      .expect((res) => {
        expect(res.body.error).toBe("Unauthorized");
      })
      .expect(401);
  });
});
