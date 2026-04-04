import request from "supertest";
import { test as base, describe, expect } from "vitest";

import type { Build, Project } from "@/database/models";
import { UserAccessToken, UserAccessTokenScope } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
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

  test("returns a project on explicit route with a user access token", async () => {
    const [user, account] = await Promise.all([
      factory.User.create(),
      factory.TeamAccount.create({ slug: "acme" }),
    ]);
    const [project] = await Promise.all([
      factory.Project.create({
        accountId: account.id,
        name: "web",
      }),
      factory.UserAccount.create({ userId: user.id }),
      factory.TeamUser.create({
        teamId: account.teamId,
        userId: user.id,
        userLevel: "member",
      }),
    ]);

    const token = UserAccessToken.generateToken();
    const userAccessToken = await UserAccessToken.query().insertAndFetch({
      name: "token-1",
      source: "user",
      userId: user.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: account.id,
    });

    await request(app)
      .get("/projects/acme/web")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(project.id);
      });
  });
});
