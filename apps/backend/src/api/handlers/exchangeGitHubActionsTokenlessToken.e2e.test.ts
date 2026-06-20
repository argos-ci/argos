import type { PartialModelObject } from "objection";
import request from "supertest";
import { test as base, beforeEach, describe, expect, vi } from "vitest";

import { getAuthProjectPayloadFromBearerToken } from "@/auth/project";
import type { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import * as githubModule from "@/github";
import { setupRedis } from "@/util/redis/testing";

import { createTestHandlerApp } from "../test-util";
import { exchangeGitHubActionsTokenlessToken } from "./exchangeGitHubActionsTokenlessToken";

vi.mock("@/github", async () => {
  const actual = await vi.importActual<typeof import("@/github")>("@/github");
  return {
    ...actual,
    getInstallationOctokit: vi.fn(),
    checkOctokitErrorStatus: vi.fn(() => false),
  };
});

const getInstallationOctokit = vi.mocked(githubModule.getInstallationOctokit);

const app = createTestHandlerApp(exchangeGitHubActionsTokenlessToken);

const commitSha = "b6bf264029c03888b7fb7e6db7386f3b245b77b0";
const branch = "main";

function createTokenlessBearer(authData: {
  owner: string;
  repository: string;
  jobId: string;
  runId: string;
  project?: string;
}) {
  const payload = Buffer.from(JSON.stringify(authData)).toString("base64");
  return `tokenless-github-${payload}`;
}

function mockWorkflowRun(data: {
  status?: string | null;
  head_sha?: string;
  head_branch?: string | null;
}) {
  getInstallationOctokit.mockResolvedValue({
    actions: {
      getWorkflowRun: vi.fn().mockResolvedValue({
        data: {
          status: data.status ?? "in_progress",
          head_sha: data.head_sha ?? commitSha,
          head_branch: data.head_branch ?? branch,
        },
      }),
    },
  } as any);
}

type LinkedProject = {
  project: Project;
  bearer: string;
};

async function createLinkedProject(
  attrs: PartialModelObject<Project> = {},
): Promise<LinkedProject> {
  const account = await factory.GithubAccount.create({
    githubId: 456,
    login: "argos-ci",
    type: "organization",
  });
  const repository = await factory.GithubRepository.create({
    githubAccountId: account.id,
    githubId: 123,
    name: "argos",
  });
  const installation = await factory.GithubInstallation.create({
    githubId: 789,
  });
  await factory.GithubRepositoryInstallation.create({
    githubRepositoryId: repository.id,
    githubInstallationId: installation.id,
  });
  const project = await factory.Project.create({
    tokenlessAuthEnabled: true,
    githubRepositoryId: repository.id,
    ...attrs,
  });

  const bearer = createTokenlessBearer({
    owner: "argos-ci",
    repository: "argos",
    jobId: "1",
    runId: "42",
  });

  return { project, bearer };
}

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("exchangeGitHubActionsTokenlessToken", () => {
  test("exchanges a tokenless token for a short-lived project token", async ({
    linkedProject,
  }) => {
    mockWorkflowRun({});

    const res = await request(app)
      .post("/auth/github-actions/tokenless/exchange")
      .send({
        tokenlessToken: linkedProject.bearer,
        commit: commitSha,
        branch,
      })
      .expect(200);

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

    await request(app)
      .post("/auth/github-actions/tokenless/exchange")
      .send({ tokenlessToken: bearer, commit: commitSha, branch })
      .expect(401)
      .expect((res) => {
        expect(res.body.error).toBe(
          "No project found. Tokenless authentication requires an Argos project to be linked to your GitHub repository.",
        );
      });
  });

  test("rejects when tokenless auth is disabled on the project", async ({
    linkedProject,
  }) => {
    mockWorkflowRun({});
    await linkedProject.project.$query().patch({
      tokenlessAuthEnabled: false,
    });

    await request(app)
      .post("/auth/github-actions/tokenless/exchange")
      .send({
        tokenlessToken: linkedProject.bearer,
        commit: commitSha,
        branch,
      })
      .expect(403)
      .expect((res) => {
        expect(res.body.error).toBe(
          "Tokenless authentication is not enabled for this project.",
        );
      });
  });

  test("rejects when the requested commit does not match the workflow run", async ({
    linkedProject,
  }) => {
    mockWorkflowRun({ head_sha: "0000000000000000000000000000000000000000" });

    await request(app)
      .post("/auth/github-actions/tokenless/exchange")
      .send({
        tokenlessToken: linkedProject.bearer,
        commit: commitSha,
        branch,
      })
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
    mockWorkflowRun({ head_branch: "feature" });

    await request(app)
      .post("/auth/github-actions/tokenless/exchange")
      .send({
        tokenlessToken: linkedProject.bearer,
        commit: commitSha,
        branch,
      })
      .expect(401)
      .expect((res) => {
        expect(res.body.error).toBe(
          "GitHub Actions workflow run does not match branch.",
        );
      });
  });

  describe("when multiple projects are linked to the GitHub repository", () => {
    async function createRepositoryWithProjects() {
      const account = await factory.GithubAccount.create({
        githubId: 456,
        login: "argos-ci",
        type: "organization",
      });
      const repository = await factory.GithubRepository.create({
        githubAccountId: account.id,
        githubId: 123,
        name: "argos",
      });
      const installation = await factory.GithubInstallation.create({
        githubId: 789,
      });
      await factory.GithubRepositoryInstallation.create({
        githubRepositoryId: repository.id,
        githubInstallationId: installation.id,
      });

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
      mockWorkflowRun({});

      const bearer = createTokenlessBearer({
        owner: "argos-ci",
        repository: "argos",
        jobId: "1",
        runId: "42",
      });

      await request(app)
        .post("/auth/github-actions/tokenless/exchange")
        .send({ tokenlessToken: bearer, commit: commitSha, branch })
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
      mockWorkflowRun({});

      const bearer = createTokenlessBearer({
        owner: "argos-ci",
        repository: "argos",
        jobId: "1",
        runId: "42",
        project: "team-b/project-b",
      });

      const res = await request(app)
        .post("/auth/github-actions/tokenless/exchange")
        .send({ tokenlessToken: bearer, commit: commitSha, branch })
        .expect(200);

      const auth = await getAuthProjectPayloadFromBearerToken(res.body.token);
      expect(auth.project.id).toBe(projectB.id);
    });

    test("rejects when the provided slug does not match any linked project", async () => {
      await setupDatabase();
      await createRepositoryWithProjects();
      mockWorkflowRun({});

      const bearer = createTokenlessBearer({
        owner: "argos-ci",
        repository: "argos",
        jobId: "1",
        runId: "42",
        project: "team-a/unknown",
      });

      await request(app)
        .post("/auth/github-actions/tokenless/exchange")
        .send({ tokenlessToken: bearer, commit: commitSha, branch })
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe(
            `Project "team-a/unknown" not found for GitHub repository (token: "${bearer}"). Ensure the project slug matches an Argos project linked to this repository.`,
          );
        });
    });
  });
});
