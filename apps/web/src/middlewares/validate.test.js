import request from "supertest";
import express from "express";
import { validate } from "./validate";

const createApp = (...middlewares) => {
  const app = express();
  app.use(
    ...middlewares,
    (_req, res) => {
      res.sendStatus(200);
    },
    // eslint-disable-next-line no-unused-vars
    (_err, _req, res, _next) => {
      if (_err.statusCode) {
        res.status(_err.statusCode);
      }

      res.send(_err.message);
    }
  );
  return app;
};

describe("validate", () => {
  it("validates query", async () => {
    const app = createApp(
      validate({
        query: {
          type: "object",
          required: ["foo"],
          properties: { foo: { type: "number" } },
        },
      })
    );
    await request(app)
      .get("/")
      .expect((res) => {
        expect(res.text).toBe(
          "Request query validation failed: data should have required property 'foo'"
        );
      })
      .expect(400);
  });

  it("validates params", async () => {
    const app = createApp(
      validate({
        params: {
          type: "object",
          required: ["foo"],
          properties: { foo: { type: "number" } },
        },
      })
    );
    await request(app)
      .get("/")
      .expect((res) => {
        expect(res.text).toBe(
          "Request URL parameters validation failed: data should have required property 'foo'"
        );
      })
      .expect(400);
  });

  it("validates body", async () => {
    const app = createApp(
      validate({
        body: {
          type: "object",
          required: ["foo"],
          properties: { foo: { type: "number" } },
        },
      })
    );
    await request(app)
      .get("/")
      .expect((res) => {
        expect(res.text).toBe(
          "Request body validation failed: data should be object"
        );
      })
      .expect(400);
  });
});
