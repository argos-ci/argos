import type { DeploymentEnvironment } from "@argos/schemas/deployment";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import { getAuthProjectPayloadFromBearerToken } from "@/auth/project";
import {
  branch,
  commitSha,
  createLinkedProject,
  setupGithubServer,
  stubWorkflowRuns,
  type LinkedProject,
} from "@/auth/tokenless/github-actions.test-util";
import { Deployment, DeploymentAlias } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { setupRedis } from "@/util/redis/testing";

import { createDeployment } from "../handlers/createDeployment";
import { exchangeGitHubActionsTokenlessToken } from "../handlers/exchangeGitHubActionsTokenlessToken";
import { finalizeDeployment } from "../handlers/finalizeDeployment";
import { createTestHandlerApp } from "../test-util";
import { assertAuthCanDeploy } from "./deployment";

const app = createTestHandlerApp(
  createDeployment,
  finalizeDeployment,
  exchangeGitHubActionsTokenlessToken,
);

const test = base.extend<{ linkedProject: LinkedProject }>({
  linkedProject: async ({}, use) => {
    await setupDatabase();
    const linkedProject = await createLinkedProject();
    stubWorkflowRuns({ 42: {} });
    await use(linkedProject);
  },
});

setupRedis();
setupGithubServer();

function postDeployment(
  bearer: string,
  input: { branch: string; environment?: DeploymentEnvironment },
) {
  return request(app)
    .post("/deployments")
    .set("Authorization", `Bearer ${bearer}`)
    .send({
      // Any commit: nothing binds a tokenless bearer to the run's.
      commit: "f".repeat(40),
      ...input,
      files: [
        {
          path: "index.html",
          hash: "a".repeat(64),
          size: 10,
          contentType: "text/html",
        },
      ],
    });
}

describe("tokenless deployments", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test.for([
    {
      name: "to production",
      branch: "feature",
      environment: "production",
      error:
        "Tokenless authentication cannot deploy to production. Authenticate with GitHub Actions OIDC or set the ARGOS_TOKEN environment variable.",
    },
    {
      name: "to production inferred from the branch",
      branch: "main",
      error:
        "Tokenless authentication cannot deploy to production. Authenticate with GitHub Actions OIDC or set the ARGOS_TOKEN environment variable.",
    },
    {
      name: "of the production branch as a preview",
      branch: "main",
      environment: "preview",
      error:
        'Tokenless authentication cannot deploy the production branch "main". Authenticate with GitHub Actions OIDC or set the ARGOS_TOKEN environment variable.',
    },
  ] as const)(
    "refuses a deployment $name",
    async ({ name: _name, error, ...input }, { linkedProject }) => {
      await postDeployment(linkedProject.bearer, input)
        .expect(403)
        .expect((res) => {
          expect(res.body.error).toBe(error);
        });

      await expect(Deployment.query().resultSize()).resolves.toBe(0);
    },
  );

  test("refuses a production deployment to the token exchanged for a tokenless bearer", async ({
    linkedProject,
  }) => {
    const exchanged = await request(app)
      .post("/auth/github-actions/tokenless/exchange")
      .send({ tokenlessToken: linkedProject.bearer, commit: commitSha, branch })
      .expect(200);

    await postDeployment(exchanged.body.token, { branch }).expect(403);

    await expect(Deployment.query().resultSize()).resolves.toBe(0);
  });

  test("refuses to finalize a production deployment", async ({
    linkedProject,
  }) => {
    const deployment = await factory.Deployment.create({
      projectId: linkedProject.project.id,
      status: "pending",
      environment: "production",
      branch: "main",
    });

    await request(app)
      .post(`/deployments/${deployment.id}/finalize`)
      .set("Authorization", `Bearer ${linkedProject.bearer}`)
      .expect(403);

    await expect(deployment.$query()).resolves.toMatchObject({
      status: "pending",
    });
    await expect(DeploymentAlias.query().resultSize()).resolves.toBe(0);
  });

  test("allows a preview of another branch", async ({ linkedProject }) => {
    const auth = await getAuthProjectPayloadFromBearerToken(
      linkedProject.bearer,
    );

    await expect(
      assertAuthCanDeploy(auth, {
        project: linkedProject.project,
        environment: "preview",
        branch: "feature",
      }),
    ).resolves.toBeUndefined();
  });
});
