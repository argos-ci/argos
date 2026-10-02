import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

import type { Project } from "@/database/models";
import { factory } from "@/database/testing";

export const commitSha = "b6bf264029c03888b7fb7e6db7386f3b245b77b0";
export const branch = "main";

const githubServer = setupServer();

/**
 * Stand in for the GitHub API for the duration of the test file. Requests it
 * was not told to answer, see {@link stubWorkflowRuns}, fail.
 */
export function setupGithubServer() {
  beforeAll(() => {
    githubServer.listen({
      onUnhandledRequest: (request, print) => {
        // Supertest reaches the app under test through the loopback interface.
        if (new URL(request.url).hostname !== "127.0.0.1") {
          print.error();
        }
      },
    });
  });

  afterEach(() => {
    githubServer.resetHandlers();
  });

  afterAll(() => {
    githubServer.close();
  });
}

type WorkflowRun = {
  status: string;
  head_sha: string;
  head_branch: string;
};

/**
 * Answer the workflow run lookups from `runs`, by run id, with a run in
 * progress on {@link commitSha} and {@link branch} unless told otherwise. Any
 * other run is not found. Returns the ids of the runs looked up.
 */
export function stubWorkflowRuns(runs: Record<number, Partial<WorkflowRun>>) {
  const lookups: number[] = [];
  githubServer.use(
    http.get<{ runId: string }>(
      "https://api.github.com/repos/:owner/:repo/actions/runs/:runId",
      ({ params }) => {
        const runId = Number(params.runId);
        lookups.push(runId);
        const run = runs[runId];

        if (!run) {
          return HttpResponse.json({ message: "Not Found" }, { status: 404 });
        }

        return HttpResponse.json({
          status: "in_progress",
          head_sha: commitSha,
          head_branch: branch,
          ...run,
        });
      },
    ),
  );
  return lookups;
}

export function createTokenlessBearer(authData: {
  owner: string;
  repository: string;
  jobId: string;
  runId: string;
  project?: string;
}) {
  const payload = Buffer.from(JSON.stringify(authData)).toString("base64");
  return `tokenless-github-${payload}`;
}

/**
 * Create the `argos-ci/argos` GitHub repository. Its installation already
 * holds a token, so that lookups go straight to the workflow run.
 */
export async function createGithubRepository() {
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
    githubToken: "ghs_test",
    githubTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  await factory.GithubRepositoryInstallation.create({
    githubRepositoryId: repository.id,
    githubInstallationId: installation.id,
  });
  return repository;
}

export type LinkedProject = {
  project: Project;
  /**
   * Bearer of run 42 of the repository.
   */
  bearer: string;
};

/**
 * Create a project accepting tokenless authentication, linked to the
 * repository of {@link createGithubRepository}.
 */
export async function createLinkedProject(): Promise<LinkedProject> {
  const repository = await createGithubRepository();
  const project = await factory.Project.create({
    tokenlessAuthEnabled: true,
    githubRepositoryId: repository.id,
  });
  const bearer = createTokenlessBearer({
    owner: "argos-ci",
    repository: "argos",
    jobId: "1",
    runId: "42",
  });
  return { project, bearer };
}
