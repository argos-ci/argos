import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { getAuthorizationServerMetadata } from "@/oauth/metadata";
import { setupRedis } from "@/util/redis/testing";

import { createApp } from "./app";

describe("well-known documents on the app origin", () => {
  let app: Express;

  setupRedis();

  beforeAll(async () => {
    app = await createApp();
  });

  function get(path: string) {
    return request(app).get(path).set("Host", "app.argos-ci.dev");
  }

  it("404s OpenID Connect discovery as JSON instead of serving the SPA shell", async () => {
    const res = await get("/.well-known/openid-configuration").expect(404);
    // The body, not only the status: without a frontend build, as in CI, the
    // SPA catch-all fails with a 404 of its own.
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("still serves the authorization server metadata clients fall back to", async () => {
    const res = await get("/.well-known/oauth-authorization-server").expect(
      200,
    );
    expect(res.body).toEqual(getAuthorizationServerMetadata());
  });
});
