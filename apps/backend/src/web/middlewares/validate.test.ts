import request from "supertest";
import { describe, expect, it } from "vitest";

import { createTestApp } from "../test-util.js";
import { validate } from "./validate.js";

describe("validate", () => {
  it("validates query", async () => {
    const app = createTestApp(
      validate({
        query: {
          type: "object",
          required: ["foo"],
          properties: { foo: { type: "number" } },
        },
      }),
      (_req, res) => {
        res.sendStatus(200);
      },
    );
    await request(app)
      .get("/")
      .expect((res) => {
        expect(res.text).toBe(
          "Request query validation failed: data must have required property 'foo'",
        );
      })
      .expect(400);
  });

  it("validates params", async () => {
    const app = createTestApp(
      validate({
        params: {
          type: "object",
          required: ["foo"],
          properties: { foo: { type: "number" } },
        },
      }),
      (_req, res) => {
        res.sendStatus(200);
      },
    );
    await request(app)
      .get("/")
      .expect((res) => {
        expect(res.text).toBe(
          "Request URL parameters validation failed: data must have required property 'foo'",
        );
      })
      .expect(400);
  });

  it("validates body", async () => {
    const app = createTestApp(
      validate({
        body: {
          type: "object",
          required: ["foo"],
          properties: { foo: { type: "number" } },
        },
      }),
      (_req, res) => {
        res.sendStatus(200);
      },
    );
    await request(app)
      .get("/")
      .expect((res) => {
        expect(res.text).toBe(
          "Request body validation failed: data must be object",
        );
      })
      .expect(400);
  });
});
