import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import { Deployment, DeploymentNotification } from "@/database/models";
import type { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { createDeployment } from "./createDeployment";

const app = createTestHandlerApp(createDeployment);

const commit = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const test = base.extend<{
  project: Project;
}>({
  project: [
    async ({}, use) => {
      await setupDatabase();
      const account = await factory.TeamAccount.create({
        slug: "awesome-team",
      });
      const project = await factory.Project.create({
        accountId: account.id,
        name: "web",
        deploymentProdBranchGlob: "main",
      });
      await factory.createProjectToken({
        projects: [project],
        token: "the-awesome-token",
      });
      await use(project);
    },
    { auto: true },
  ],
});

describe("createDeployment", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  describe("with a url", () => {
    test("reports a deployment hosted elsewhere", async ({ project }) => {
      const res = await request(app)
        .post("/deployments")
        .set("Authorization", "Bearer the-awesome-token")
        .send({
          commit,
          branch: "feature/login",
          url: "https://WEB-git-feature-login.vercel.app",
        })
        .expect(201);

      expect(res.body.uploadFiles).toEqual([]);

      const deployment = await Deployment.query()
        .findById(res.body.deploymentId)
        .throwIfNotFound();
      expect(deployment).toMatchObject({
        projectId: project.id,
        status: "ready",
        environment: "preview",
        branch: "feature/login",
        commitSha: commit,
        slug: null,
        externalUrl: "https://web-git-feature-login.vercel.app/",
      });
      expect(deployment.url).toBe("https://web-git-feature-login.vercel.app/");

      // Queued so the pull request comment lists the deployment.
      await expect(
        DeploymentNotification.query().where("deploymentId", deployment.id),
      ).resolves.toMatchObject([{ type: "success" }]);
    });

    test("infers production from the production branch", async () => {
      const res = await request(app)
        .post("/deployments")
        .set("Authorization", "Bearer the-awesome-token")
        .send({ commit, branch: "main", url: "https://web.example.com" })
        .expect(201);

      await expect(
        Deployment.query().findById(res.body.deploymentId),
      ).resolves.toMatchObject({ environment: "production" });
    });

    test("rejects a url that is not http or https", async () => {
      const res = await request(app)
        .post("/deployments")
        .set("Authorization", "Bearer the-awesome-token")
        .send({ commit, branch: "main", url: "javascript:alert(1)" })
        .expect(400);

      expect(res.body.details).toContainEqual({
        message: "url is Invalid URL",
      });
      await expect(Deployment.query().resultSize()).resolves.toBe(0);
    });
  });

  test("rejects a body with both files and a url", async () => {
    const res = await request(app)
      .post("/deployments")
      .set("Authorization", "Bearer the-awesome-token")
      .send({
        commit,
        branch: "main",
        url: "https://web.example.com",
        files: [
          {
            path: "index.html",
            hash: "a".repeat(64),
            size: 1,
            contentType: "text/html",
          },
        ],
      })
      .expect(400);

    expect(res.body.error).toBe(
      "`files` and `url` can't be used together. Send `files` to deploy on Argos, or `url` for a deployment hosted elsewhere.",
    );
    await expect(Deployment.query().resultSize()).resolves.toBe(0);
  });

  test("rejects a body with neither files nor a url", async () => {
    const res = await request(app)
      .post("/deployments")
      .set("Authorization", "Bearer the-awesome-token")
      .send({ commit, branch: "main" })
      .expect(400);

    expect(res.body.error).toBe(
      "`files` or `url` is required. Send `files` to deploy on Argos, or `url` for a deployment hosted elsewhere.",
    );
  });
});
