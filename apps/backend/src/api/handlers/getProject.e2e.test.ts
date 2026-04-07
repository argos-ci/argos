import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import type { Account, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { getProject } from "./getProject";

const app = createTestHandlerApp(getProject);

const test = base.extend<{
  account: Account;
  project: Project;
}>({
  account: async ({}, use) => {
    await setupDatabase();
    const account = await factory.TeamAccount.create({ slug: "acme" });
    await use(account);
  },
  project: async ({ account }, use) => {
    const project = await factory.Project.create({
      accountId: account.id,
      name: "web",
      token: "the-awesome-token",
    });
    await use(project);
  },
});

describe("getProject", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  describe("without a valid token", () => {
    test("returns 401 status code", async () => {
      await request(app)
        .get("/projects/acme/web")
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.body.error).toBe(
            `Project not found in Argos. If the issue persists, verify your token. (token: "invalid-token").`,
          );
        })
        .expect(401);
    });
  });

  test("returns a project for a project token", async ({ project }) => {
    await request(app)
      .get("/projects/acme/web")
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

  test("returns 401 when a project token accesses another project", async ({
    account,
  }) => {
    await factory.Project.create({
      accountId: account.id,
      name: "docs",
    });

    await request(app)
      .get("/projects/acme/docs")
      .set("Authorization", "Bearer the-awesome-token")
      .expect((res) => {
        expect(res.body.error).toBe(
          `Project not found in Argos. If the issue persists, verify your token. (token: "the-awesome-token").`,
        );
      })
      .expect(401);
  });
});
