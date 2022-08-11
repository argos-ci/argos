import request from "supertest";
import { repoAuth } from "./repoAuth";
import { useDatabase, factory } from "@argos-ci/database/testing";
import { createTestApp } from "../test-util";

const app = createTestApp(repoAuth, (req, res) => {
  res.send({ authRepository: req.authRepository });
});

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
