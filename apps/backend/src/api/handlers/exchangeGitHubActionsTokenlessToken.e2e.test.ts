import { countBy } from "lodash-es";
import request from "supertest";
import { test as base, describe, expect } from "vitest";

import { getAuthProjectPayloadFromBearerToken } from "@/auth/project";
import { FAILED_RUN_LOOKUPS_LIMIT } from "@/auth/tokenless/github-actions";
import {
  branch,
  commitSha,
  createGithubRepository,
  createLinkedProject,
  createTokenlessBearer,
  setupGithubServer,
  stubWorkflowRuns,
  type LinkedProject,
} from "@/auth/tokenless/github-actions.test-util";
import { factory, setupDatabase } from "@/database/testing";
import { setupRedis } from "@/util/redis/testing";

import { createTestHandlerApp } from "../test-util";
import { exchangeGitHubActionsTokenlessToken } from "./exchangeGitHubActionsTokenlessToken";

const app = createTestHandlerApp(exchangeGitHubActionsTokenlessToken);

const test = base.extend<{
  linkedProject: LinkedProject;
}>({
  linkedProject: async ({}, use) => {
    await setupDatabase();
    const linkedProject = await createLinkedProject();
    await use(linkedProject);
  },
});

setupRedis();
setupGithubServer();

function exchange(tokenlessToken: string) {
  return request(app)
    .post("/auth/github-actions/tokenless/exchange")
    .send({ tokenlessToken, commit: commitSha, branch });
}

describe("exchangeGitHubActionsTokenlessToken", () => {
  test("exchanges a tokenless token for a short-lived project token", async ({
    linkedProject,
  }) => {
    stubWorkflowRuns({ 42: {} });

    const res = await exchange(linkedProject.bearer).expect(200);

    expect(res.body).toEqual({
      token: expect.stringMatching(/^argos_tmp_/),
      expiresAt: expect.any(String),
    });
    expect(Date.parse(res.body.expiresAt)).toBeGreaterThan(Date.now());

    const auth = await getAuthProjectPayloadFromBearerToken(res.body.token);
    expect(auth.project.id).toBe(linkedProject.project.id);
  });

  test("rejects when no project is linked to the GitHub repository", async () => {
    await setupDatabase();
    const bearer = createTokenlessBearer({
      owner: "unknown",
      repository: "missing",
      jobId: "1",
      runId: "42",
    });

    await exchange(bearer)
      .expect(401)
      .expect((res) => {
        expect(res.body.error).toBe(
          "No project found. Tokenless authentication requires an Argos project to be linked to your GitHub repository.",
        );
      });
  });

  test("rejects when tokenless auth is disabled on the project, without asking GitHub", async ({
    linkedProject,
  }) => {
    const lookups = stubWorkflowRuns({ 42: {} });
    await linkedProject.project.$query().patch({
      tokenlessAuthEnabled: false,
    });

    await exchange(linkedProject.bearer)
      .expect(403)
      .expect((res) => {
        expect(res.body.error).toBe(
          "Tokenless authentication is disabled for this project. Set the ARGOS_TOKEN environment variable to authenticate.",
        );
      });
    expect(lookups).toEqual([]);
  });

  test("rejects when the requested commit does not match the workflow run", async ({
    linkedProject,
  }) => {
    stubWorkflowRuns({
      42: { head_sha: "0000000000000000000000000000000000000000" },
    });

    await exchange(linkedProject.bearer)
      .expect(401)
      .expect((res) => {
        expect(res.body.error).toBe(
          "GitHub Actions workflow run does not match commit.",
        );
      });
  });

  test("rejects when the requested branch does not match the workflow run", async ({
    linkedProject,
  }) => {
    stubWorkflowRuns({ 42: { head_branch: "feature" } });

    await exchange(linkedProject.bearer)
      .expect(401)
      .expect((res) => {
        expect(res.body.error).toBe(
          "GitHub Actions workflow run does not match branch.",
        );
      });
  });

  test("stops asking GitHub once an installation has had too many lookups find no run in progress", async ({
    linkedProject,
  }) => {
    const lookups = stubWorkflowRuns({ 42: {} });
    const forgeBearer = (runId: number) =>
      createTokenlessBearer({
        owner: "argos-ci",
        repository: "argos",
        jobId: "1",
        runId: String(runId),
      });

    // Found in progress, so it is not counted.
    await exchange(linkedProject.bearer).expect(200);

    const forged = await Promise.all(
      Array.from({ length: FAILED_RUN_LOOKUPS_LIMIT + 5 }, (_, index) =>
        exchange(forgeBearer(1000 + index)),
      ),
    );
    expect(countBy(forged, "status")).toEqual({
      404: FAILED_RUN_LOOKUPS_LIMIT,
      429: 5,
    });

    await exchange(forgeBearer(2000))
      .expect(429)
      .expect((res) => {
        expect(res.body.error).toBe(
          "Too many failed tokenless authentication attempts for this GitHub installation. Retry later, or set the ARGOS_TOKEN environment variable to authenticate.",
        );
      });

    // A run already seen in progress is not looked up again.
    await exchange(linkedProject.bearer).expect(200);

    expect(lookups).toHaveLength(1 + FAILED_RUN_LOOKUPS_LIMIT);
  });

  describe("when multiple projects are linked to the GitHub repository", () => {
    async function createRepositoryWithProjects() {
      const repository = await createGithubRepository();

      const teamA = await factory.TeamAccount.create({ slug: "team-a" });
      const teamB = await factory.TeamAccount.create({ slug: "team-b" });

      const projectA = await factory.Project.create({
        name: "project-a",
        accountId: teamA.id,
        tokenlessAuthEnabled: true,
        githubRepositoryId: repository.id,
      });
      const projectB = await factory.Project.create({
        name: "project-b",
        accountId: teamB.id,
        tokenlessAuthEnabled: true,
        githubRepositoryId: repository.id,
      });

      return { projectA, projectB };
    }

    test("rejects when no project slug is provided", async () => {
      await setupDatabase();
      await createRepositoryWithProjects();

      const bearer = createTokenlessBearer({
        owner: "argos-ci",
        repository: "argos",
        jobId: "1",
        runId: "42",
      });

      await exchange(bearer)
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe(
            `Multiple projects found for GitHub repository (token: "${bearer}"). Please specify a project slug or a project token.`,
          );
        });
    });

    test("resolves the project matching the provided slug", async () => {
      await setupDatabase();
      const { projectB } = await createRepositoryWithProjects();
      stubWorkflowRuns({ 42: {} });

      const bearer = createTokenlessBearer({
        owner: "argos-ci",
        repository: "argos",
        jobId: "1",
        runId: "42",
        project: "team-b/project-b",
      });

      const res = await exchange(bearer).expect(200);

      const auth = await getAuthProjectPayloadFromBearerToken(res.body.token);
      expect(auth.project.id).toBe(projectB.id);
    });

    test("rejects when the provided slug does not match any linked project", async () => {
      await setupDatabase();
      await createRepositoryWithProjects();

      const bearer = createTokenlessBearer({
        owner: "argos-ci",
        repository: "argos",
        jobId: "1",
        runId: "42",
        project: "team-a/unknown",
      });

      await exchange(bearer)
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe(
            `Project "team-a/unknown" not found for GitHub repository (token: "${bearer}"). Ensure the project slug matches an Argos project linked to this repository.`,
          );
        });
    });
  });
});
