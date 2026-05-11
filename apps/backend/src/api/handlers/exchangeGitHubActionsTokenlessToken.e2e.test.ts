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
          "Unable to resolve the GitHub Actions workflow run context. No Argos project may be linked to this workflow run, or the GitHub installation required to access it may be missing or disabled.",
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
});
