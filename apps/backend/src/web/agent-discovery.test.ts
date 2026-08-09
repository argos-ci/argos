import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { getServerCard } from "@/mcp/server-card";
import {
  getApiResourceUrl,
  getMcpResourceUrl,
  getProtectedResourceMetadata,
} from "@/oauth/metadata";

import { installAgentDiscoveryRoutes } from "./agent-discovery";

describe("agent discovery routes", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    const router = express.Router();
    installAgentDiscoveryRoutes(router);
    app.use(router);
  });

  it("serves the API catalog as a linkset", async () => {
    const res = await request(app).get("/.well-known/api-catalog").expect(200);
    expect(res.headers["content-type"]).toContain("application/linkset+json");
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    const anchors = res.body.linkset.map(
      (entry: { anchor: string }) => entry.anchor,
    );
    expect(anchors).toEqual([getApiResourceUrl(), getMcpResourceUrl()]);
    const [api] = res.body.linkset;
    expect(api["service-desc"]).toEqual([
      { href: `${getApiResourceUrl()}/openapi.yaml`, type: "application/yaml" },
    ]);
    // The health endpoint lives at the API origin root, not under /v2.
    expect(api.status[0].href).toBe(
      new URL("/status", getApiResourceUrl()).toString(),
    );
  });

  it("serves the REST API protected resource metadata", async () => {
    const res = await request(app)
      .get("/.well-known/oauth-protected-resource")
      .expect(200);
    expect(res.body).toEqual(getProtectedResourceMetadata());
  });

  it("serves the MCP server card", async () => {
    const res = await request(app)
      .get("/.well-known/mcp/server-card.json")
      .expect(200);
    expect(res.body).toEqual(getServerCard());
  });
});
