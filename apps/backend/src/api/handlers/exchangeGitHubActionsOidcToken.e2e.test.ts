import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
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

import { getAuthProjectPayloadFromBearerToken } from "@/auth/project";
import type { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { closeRedis } from "@/util/redis/client";

import { createTestHandlerApp } from "../test-util";
import { exchangeGitHubActionsOidcToken } from "./exchangeGitHubActionsOidcToken";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const jwk = {
  ...publicKey.export({ format: "jwk" }),
  alg: "RS256",
  kid: "test-key",
  use: "sig",
};

const server = setupServer(
  http.get("https://token.actions.githubusercontent.com/.well-known/jwks", () =>
    HttpResponse.json({ keys: [jwk] }),
  ),
);

const sha = "b6bf264029c03888b7fb7e6db7386f3b245b77b0";

function signGitHubActionsToken(overrides: Record<string, unknown> = {}) {
  return jwt.sign(
    {
      sub: "repo:argos-ci/argos:ref:refs/heads/main",
      repository: "argos-ci/argos",
      repository_id: "123",
      repository_owner: "argos-ci",
      repository_owner_id: "456",
      ref: "refs/heads/main",
      ref_type: "branch",
      sha,
      ...overrides,
    },
    privateKey,
    {
      algorithm: "RS256",
      audience: "https://argos-ci.com",
      expiresIn: "5m",
      issuer: "https://token.actions.githubusercontent.com",
      keyid: "test-key",
    },
  );
}

const app = createTestHandlerApp(exchangeGitHubActionsOidcToken);

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

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(async () => {
  server.close();
  await closeRedis();
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
        branch: "main",
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
          "GitHub Actions OIDC authentication is not enabled for this project.",
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
