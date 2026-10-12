import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { getAuthorizationServerMetadata } from "@/oauth/metadata";
import { setupRedis } from "@/util/redis/testing";

import { createApp } from "./app";

describe("app origin", () => {
  let app: Express;

  setupRedis();

  beforeAll(async () => {
    app = await createApp();
  });

  function get(path: string) {
    return request(app).get(path).set("Host", "app.argos-ci.dev");
  }

  describe("well-known documents", () => {
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

  describe("security headers", () => {
    it("are sent on /assets responses, not only on the shell", async () => {
      // The URL shape a security scan probed. A missing asset is the case that
      // runs without a frontend build, and it is answered from the same place
      // in the router as a found one.
      const res = await get("/assets/common-DAxmghT-.js/4cf97fe40").expect(404);
      expect(res.headers["content-security-policy"]).toContain(
        "frame-ancestors 'none'",
      );
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["strict-transport-security"]).toMatch(/max-age=\d+/);
    });
  });
});
