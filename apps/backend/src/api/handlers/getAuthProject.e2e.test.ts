import request from "supertest";
import { test as base, describe, expect } from "vitest";

import type { Build, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { getAuthProject } from "./getAuthProject";

const app = createTestHandlerApp(getAuthProject);
const test = base.extend<{
  project: Project;
  builds: Build[];
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
});

describe("getAuthProject", () => {
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
          name: project.name,
          defaultBaseBranch: "main",
          hasRemoteContentAccess: false,
        });
      });
  });
});
