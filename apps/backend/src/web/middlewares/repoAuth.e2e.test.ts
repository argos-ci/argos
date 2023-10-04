import type { RequestHandler } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Project } from "@/database/models/index.js";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { createTestApp } from "../test-util.js";
import { repoAuth } from "./repoAuth.js";

const app = createTestApp(repoAuth, ((req, res) => {
  res.send({ authProject: req.authProject });
}) as RequestHandler);

const encodeToken = ({
  owner,
  repository,
  jobId,
  runId,
}: {
  owner: string;
  repository: string;
  jobId: string;
  runId: string;
}) =>
  Buffer.from(
    JSON.stringify({ owner, repository, jobId, runId }),
    "utf8",
  ).toString("base64");

describe("repoAuth", () => {
  let project: Project;

  beforeEach(async () => {
    await setupDatabase();
  });

  describe("Argos token", () => {
    beforeEach(async () => {
      project = await factory.Project.create({
        token: "the-awesome-token",
      });
    });

    it("returns 401 without a valid token", async () => {
      await request(app)
        .get("/")
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.text).toBe(
            `Repository not found (token: "invalid-token")`,
          );
        })
        .expect(401);
    });

    it("puts authProject in req with a valid token", async () => {
      await request(app)
        .get("/")
        .set("Authorization", "Bearer the-awesome-token")
        .expect((res) => {
          expect(res.body.authProject.id).toBe(project.id);
        })
        .expect(200);
    });
  });

  describe("GitHub token", () => {
    beforeEach(async () => {
      const ghAccount = await factory.GithubAccount.create({
        login: "argos-ci",
      });
      const repository = await factory.GithubRepository.create({
        githubAccountId: ghAccount.id,
      });
      project = await factory.Project.create({
        name: "argos",
        token: "the-awesome-token",
        githubRepositoryId: repository.id,
      });
    });

    it("returns 401 without a invalid token format", async () => {
      await request(app)
        .get("/")
        .set("Authorization", "Bearer tokenless-github-invalid-format")
        .expect((res) => {
          expect(res.text).toBe(
            `Invalid token (token: "tokenless-github-invalid-format")`,
          );
        })
        .expect(401);
    });

    it("returns 401 with unknown repository", async () => {
      const encodedToken = encodeToken({
        owner: "argos-ci",
        repository: "unknown-repo",
        jobId: "job-name",
        runId: "5286066124",
      });

      await request(app)
        .get("/")
        .set("Authorization", `Bearer tokenless-github-${encodedToken}`)
        .expect((res) => {
          expect(res.text).toBe(
            `Repository not found (token: "tokenless-github-${encodedToken}")`,
          );
        })
        .expect(401);
    });

    it("returns 401 with unknown jobId", async () => {
      const encodedToken = encodeToken({
        owner: "argos-ci",
        repository: "argos",
        jobId: "unknown-job-name",
        runId: "12345",
      });

      await request(app)
        .get("/")
        .set("Authorization", `Bearer tokenless-github-${encodedToken}`)
        .expect((res) => {
          expect(res.text).toBe(
            `Repository not found (token: "tokenless-github-${encodedToken}")`,
          );
        })
        .expect(401);
    });
  });
});
