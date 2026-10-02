import request from "supertest";
import { test as base, describe, expect } from "vitest";

import {
  createLinkedProject,
  setupGithubServer,
  stubWorkflowRuns,
  type LinkedProject,
} from "@/auth/tokenless/github-actions.test-util";
import type { Build, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { setupRedis } from "@/util/redis/testing";

import { createTestHandlerApp } from "../test-util";
import { getAuthProject } from "./getAuthProject";

const app = createTestHandlerApp(getAuthProject);
const test = base.extend<{
  project: Project;
  builds: Build[];
  linkedProject: LinkedProject;
}>({
  project: async ({}, use) => {
    await setupDatabase();
    const project = await factory.Project.create({
      token: "the-awesome-token",
    });
    await use(project);
  },
  builds: async ({ project }, use) => {
    const builds = await factory.Build.createMany(3, {
      projectId: project.id,
      name: "default",
    });
    // Sort builds by id desc
    builds.sort((a: Build, b: Build) => b.id.localeCompare(a.id));
    await use(builds);
  },
  linkedProject: async ({}, use) => {
    await setupDatabase();
    const linkedProject = await createLinkedProject();
    await use(linkedProject);
  },
});

setupRedis();
setupGithubServer();

describe("getAuthProject", () => {
  describe("with a tokenless GitHub Actions bearer", () => {
    test("looks the workflow run up once for all the requests it authenticates", async ({
      linkedProject,
    }) => {
      const lookups = stubWorkflowRuns({ 42: {} });

      const responses = await Promise.all(
        Array.from({ length: 3 }, () =>
          request(app)
            .get("/project")
            .set("Authorization", `Bearer ${linkedProject.bearer}`)
            .expect(200),
        ),
      );

      expect(responses.map((res) => res.body.id)).toEqual(
        Array(3).fill(linkedProject.project.id),
      );
      expect(lookups).toEqual([42]);
    });

    test("rejects it without asking GitHub when tokenless auth is disabled on the project", async ({
      linkedProject,
    }) => {
      const lookups = stubWorkflowRuns({ 42: {} });
      await linkedProject.project.$query().patch({
        tokenlessAuthEnabled: false,
      });

      await request(app)
        .get("/project")
        .set("Authorization", `Bearer ${linkedProject.bearer}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.error).toBe(
            "Tokenless authentication is disabled for this project. Set the ARGOS_TOKEN environment variable to authenticate.",
          );
        });
      expect(lookups).toEqual([]);
    });
  });

  describe("without a valid token", () => {
    test("returns 401 status code", async () => {
      await request(app)
        .get("/project")
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.body.error).toBe(
            `Project not found in Argos. If the issue persists, verify your token. (token: "invalid-token").`,
          );
        })
        .expect(401);
    });
  });

  test("returns a project", async ({ project, builds: _builds }) => {
    await request(app)
      .get("/project")
      .set("Authorization", "Bearer the-awesome-token")
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          id: project.id,
          account: expect.objectContaining({
            id: expect.any(String),
            slug: expect.any(String),
          }),
          name: project.name,
          defaultBaseBranch: "main",
          hasRemoteContentAccess: false,
          autoApprovedBranchGlob: "main",
          deploymentProductionBranchGlob: "main",
          private: true,
          summaryCheck: "auto",
          prCommentEnabled: true,
          githubActionsOidcEnabled: false,
          tokenlessAuthEnabled: false,
          deploymentEnabled: true,
          deploymentAuth: "domain-private",
          defaultUserLevel: null,
          ignoreConfig: { enabled: true, autoIgnore: { changes: 3 } },
        });
      });
  });
});
