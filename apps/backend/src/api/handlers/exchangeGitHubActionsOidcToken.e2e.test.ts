import type { PartialModelObject } from "objection";
import request from "supertest";
import {
  afterAll,
  afterEach,
  test as base,
  beforeAll,
  describe,
  expect,
} from "vitest";

import {
  defaultGitHubActionsPayload,
  githubActionsOidcServer,
  signGitHubActionsToken,
} from "@/auth/github-actions-oidc.test-util";
import { getAuthProjectPayloadFromBearerToken } from "@/auth/project";
import type { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { setupRedis } from "@/util/redis/testing";

import { createTestHandlerApp } from "../test-util";
import { exchangeGitHubActionsOidcToken } from "./exchangeGitHubActionsOidcToken";

const app = createTestHandlerApp(exchangeGitHubActionsOidcToken);

const sha = defaultGitHubActionsPayload.sha;

type LinkedProject = {
  project: Project;
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
  const project = await factory.Project.create({
    githubActionsOidcEnabled: true,
    githubRepositoryId: repository.id,
    ...attrs,
  });

  return { project };
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

beforeAll(() => {
  githubActionsOidcServer.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  githubActionsOidcServer.resetHandlers();
});

afterAll(() => {
  githubActionsOidcServer.close();
});

describe("exchangeGitHubActionsOidcToken", () => {
  test("exchanges a GitHub Actions OIDC token for a short-lived project token", async ({
    linkedProject,
  }) => {
    const res = await request(app)
      .post("/auth/github-actions/oidc/exchange")
      .send({
        oidcToken: signGitHubActionsToken(),
        repository: "argos-ci/argos",
        commit: sha,
      })
      .expect(200);

    expect(res.body).toEqual({
      token: expect.stringMatching(/^argos_tmp_/),
      expiresAt: expect.any(String),
    });
    expect(Date.parse(res.body.expiresAt)).toBeGreaterThan(Date.now());

    const auth = await getAuthProjectPayloadFromBearerToken(res.body.token);
    expect(auth.project.id).toBe(linkedProject.project.id);
    expect(auth.sha).toBe(sha);
  });

  test("rejects when GitHub Actions OIDC is disabled on the project", async ({
    linkedProject,
  }) => {
    await linkedProject.project.$query().patch({
      githubActionsOidcEnabled: false,
    });

    await request(app)
      .post("/auth/github-actions/oidc/exchange")
      .send({
        oidcToken: signGitHubActionsToken(),
        repository: "argos-ci/argos",
      })
      .expect(403)
      .expect((res) => {
        expect(res.body.error).toBe(
          "GitHub Actions OIDC authentication is not enabled for this project. Enable it in the project settings.",
        );
      });
  });

  test("rejects with project settings guidance when OIDC is disabled and the commit does not match", async ({
    linkedProject,
  }) => {
    await linkedProject.project.$query().patch({
      githubActionsOidcEnabled: false,
    });

    await request(app)
      .post("/auth/github-actions/oidc/exchange")
      .send({
        oidcToken: signGitHubActionsToken(),
        repository: "argos-ci/argos",
        commit: "0000000000000000000000000000000000000000",
      })
      .expect(403)
      .expect((res) => {
        expect(res.body.error).toBe(
          "GitHub Actions OIDC authentication is not enabled for this project. Enable it in the project settings.",
        );
      });
  });

  test("rejects when the token does not match the requested commit", async ({
    linkedProject,
  }) => {
    void linkedProject;
    await request(app)
      .post("/auth/github-actions/oidc/exchange")
      .send({
        oidcToken: signGitHubActionsToken(),
        repository: "argos-ci/argos",
        commit: "0000000000000000000000000000000000000000",
      })
      .expect(401)
      .expect((res) => {
        expect(res.body.error).toBe(
          "GitHub Actions OIDC token does not match commit.",
        );
      });
  });
});
