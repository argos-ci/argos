import request from "supertest";
import express from "express";
import { bearerAuth } from "./bearerAuth";

const app = express();
app.use(
  bearerAuth,
  (req, res) => {
    res.send({ bearerToken: req.bearerToken });
  },
  // eslint-disable-next-line no-unused-vars
  (_err, _req, res, _next) => {
    if (_err.statusCode) {
      res.status(_err.statusCode);
    }

    res.send(_err.message);
  }
);

describe("bearerAuth", () => {
  it("returns 400 without auth token", async () => {
    await request(app)
      .get("/")
      .expect((res) => {
        expect(res.text).toBe("Authorization header is missing");
      })
      .expect(400);
  });

  it("returns 400 with an invalid token", async () => {
    await request(app)
      .get("/")
      .set("Authorization", "xxx")
      .expect((res) => {
        expect(res.text).toBe("Invalid authorization header");
      })
      .expect(400);
  });

  it("returns 400 with an invalid scheme", async () => {
    await request(app)
      .get("/")
      .set("Authorization", "Beee xx")
      .expect((res) => {
        expect(res.text).toBe(
          `Invalid authorization header scheme "Beee", please use "Bearer"`
        );
      })
      .expect(400);
  });

  // eslint-disable-next-line jest/expect-expect
  it("puts bearerToken in req if everything good", async () => {
    await request(app)
      .get("/")
      .set("Authorization", "Bearer cred-x")
      .expect({ bearerToken: "cred-x" })
      .expect(200);
  });
});
