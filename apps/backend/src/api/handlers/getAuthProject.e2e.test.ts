import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Build, Project } from "@/database/models/index.js";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { createTestHandlerApp } from "../test-util";
import { getAuthProject } from "./getAuthProject";

const app = createTestHandlerApp(getAuthProject);

describe("getAuthProject", () => {
  let project: Project;
  let builds: Build[];

  beforeEach(async () => {
    await setupDatabase();
    project = await factory.Project.create({
      token: "the-awesome-token",
    });
    builds = await factory.Build.createMany(3, {
      projectId: project.id,
      name: "default",
    });
    // Sort builds by id desc
    builds.sort((a: Build, b: Build) => b.id.localeCompare(a.id));
  });

  describe("without a valid token", () => {
    it("returns 401 status code", async () => {
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

  it("returns a project", async () => {
    await request(app)
      .get("/project")
      .set("Authorization", "Bearer the-awesome-token")
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          id: project.id,
          defaultBaseBranch: "main",
          hasRemoteContentAccess: false,
        });
      });
  });
});
