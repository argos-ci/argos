import request from "supertest";

import { factory, useDatabase } from "@argos-ci/database/testing";

import { createTestApp } from "../test-util";
import { repoAuth } from "./repoAuth";

const app = createTestApp(repoAuth, (req, res) => {
  res.send({ authRepository: req.authRepository });
});

const encodeToken = ({ owner, repository, jobId, runId }) =>
  Buffer.from(
    JSON.stringify({ owner, repository, jobId, runId }),
    "utf8"
  ).toString("base64");

describe("repoAuth", () => {
  let repository;

  useDatabase();

  describe("Argos token", () => {
    beforeEach(async () => {
      repository = await factory.create("Repository", {
        name: "foo",
        token: "the-awesome-token",
      });
    });

    it("returns 401 without a valid token", async () => {
      await request(app)
        .get("/")
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.text).toBe(
            `Repository not found (token: "invalid-token")`
          );
        })
        .expect(401);
    });

    // eslint-disable-next-line jest/expect-expect
    it("puts authRepository in req with a valid token", async () => {
      await request(app)
        .get("/")
        .set("Authorization", "Bearer the-awesome-token")
        .expect((res) => {
          expect(res.body.authRepository.id).toBe(repository.id);
        })
        .expect(200);
    });
  });

  describe("GitHub token", () => {
    let organization;

    beforeEach(async () => {
      organization = await factory.create("Organization", {
        login: "argos-ci",
      });
      repository = await factory.create("Repository", {
        name: "argos",
        organizationId: organization.id,
        token: "the-awesome-token",
      });
    });

    it("returns 401 without a invalid token format", async () => {
      await request(app)
        .get("/")
        .set("Authorization", "Bearer tokenless-github-invalid-format")
        .expect((res) => {
          expect(res.text).toBe(
            `Invalid token (token: "tokenless-github-invalid-format")`
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
            `Repository not found (token: "tokenless-github-${encodedToken}")`
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
            `Repository not found (token: "tokenless-github-${encodedToken}")`
          );
        })
        .expect(401);
    });
  });
});
