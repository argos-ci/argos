import request from "supertest";
import express from "express";
import { repoAuth } from "./repoAuth";
import { useDatabase, factory } from "@argos-ci/database/testing";

const app = express();
app.use(
  repoAuth,
  (req, res) => {
    res.send({ authRepository: req.authRepository });
  },
  // eslint-disable-next-line no-unused-vars
  (_err, _req, res, _next) => {
    if (_err.statusCode) {
      res.status(_err.statusCode);
    }

    res.send(_err.message);
  }
);

describe("repoAuth", () => {
  let repository;

  useDatabase();

  beforeEach(async () => {
    repository = await factory.create("Repository", {
      enabled: false,
      name: "foo",
      token: "the-awesome-token",
    });
  });

  it("returns 401 without a valid token", async () => {
    await request(app)
      .get("/")
      .set("Authorization", "Bearer invalid-token")
      .expect((res) => {
        expect(res.text).toBe(`Repository not found (token: "invalid-token")`);
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
