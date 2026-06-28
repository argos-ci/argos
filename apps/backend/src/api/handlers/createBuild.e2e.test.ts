import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import type { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { createBuild } from "./createBuild";

const app = createTestHandlerApp(createBuild);

const test = base.extend<{ project: Project }>({
  project: async ({}, use) => {
    await setupDatabase();
    const account = await factory.TeamAccount.create({ slug: "awesome-team" });
    const project = await factory.Project.create({
      token: "the-awesome-token",
      accountId: account.id,
    });
    await use(project);
  },
});

describe("createBuild", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  describe("with more than 5000 screenshots", () => {
    test("rejects the build and points to parallel mode", async () => {
      const screenshots = Array.from({ length: 5001 }, (_, index) => ({
        key: index.toString(16).padStart(64, "0"),
        contentType: "image/png",
      }));

      await request(app)
        .post("/builds")
        .set("Authorization", "Bearer the-awesome-token")
        .send({ commit: "a".repeat(40), branch: "main", screenshots })
        .expect(400)
        .expect((res) => {
          expect(JSON.stringify(res.body)).toContain("parallel mode");
        });
    });
  });
});
