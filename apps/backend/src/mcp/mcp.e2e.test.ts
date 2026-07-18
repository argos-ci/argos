import express from "express";
import request from "supertest";
import { test as base, describe, expect, vi } from "vitest";

import {
  Account,
  OAuthClient,
  OAuthGrant,
  OAuthGrantAccount,
  Project,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";
import { notifyDiscord } from "@/discord";
import { getApiResourceUrl, getMcpResourceUrl } from "@/oauth/metadata";
import type { OAuthScope } from "@/oauth/scopes";
import { issueTokens } from "@/oauth/tokens";

import { mcpRouter } from "./router";

vi.mock("@/discord", () => ({ notifyDiscord: vi.fn(() => Promise.resolve()) }));

const app = express();
app.use(mcpRouter);

const ACCEPT = "application/json, text/event-stream";

type RpcResponse = {
  result?: {
    tools?: { name: string }[];
    content?: { type: string; text: string }[];
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
  };
  error?: { code: number; message: string };
};

async function rpc(
  token: string | null,
  method: string,
  params: Record<string, unknown> = {},
) {
  let req = request(app)
    .post("/")
    .set("Accept", ACCEPT)
    .set("Content-Type", "application/json");
  if (token) {
    req = req.set("Authorization", `Bearer ${token}`);
  }
  return req.send({ jsonrpc: "2.0", id: 1, method, params });
}

async function createOAuthAccessToken(input: {
  userAccount: Account;
  scopes: OAuthScope[];
  resource: string | null;
}) {
  const client = await OAuthClient.query().insertAndFetch({
    clientId: "test-mcp-client",
    clientName: "Test MCP Client",
    redirectUris: ["http://localhost/callback"],
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    tokenEndpointAuthMethod: "none",
    isFirstParty: false,
    verified: false,
  });
  const grant = await OAuthGrant.query().insertAndFetch({
    userId: input.userAccount.userId!,
    oauthClientId: client.id,
    scopes: input.scopes,
    lastUsedAt: null,
    revokedAt: null,
  });
  await OAuthGrantAccount.query().insert({
    oauthGrantId: grant.id,
    accountId: input.userAccount.id,
  });
  const tokens = await issueTokens({
    grantId: grant.id,
    scopes: input.scopes,
    resource: input.resource,
  });
  return tokens.accessToken;
}

const test = base.extend<{
  user: User;
  userAccount: Account;
  patToken: string;
  project: Project;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    const user = await factory.User.create();
    await use(user);
  },
  userAccount: async ({ user }, use) => {
    const userAccount = await factory.UserAccount.create({
      userId: user.id,
      name: "Jane Doe",
      slug: "jane-doe",
    });
    await use(userAccount);
  },
  patToken: async ({ user, userAccount }, use) => {
    const token = `arp_${"e".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: user.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: userAccount.id,
    });
    await use(token);
  },
  project: async ({ userAccount }, use) => {
    const project = await factory.Project.create({
      accountId: userAccount.id,
      name: "awesome-project",
      token: "the-awesome-token",
    });
    await use(project);
  },
});

describe("MCP server", () => {
  test("responds 401 with the OAuth discovery handshake when unauthenticated", async ({
    user: _user,
  }) => {
    const res = await rpc(null, "tools/list");
    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toContain(
      '/.well-known/oauth-protected-resource"',
    );
  });

  test("rejects project tokens", async ({ project: _project }) => {
    const res = await rpc("the-awesome-token", "tools/list");
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("project tokens are not accepted");
  });

  test("serves the protected resource metadata", async () => {
    const res = await request(app)
      .get("/.well-known/oauth-protected-resource")
      .expect(200);
    expect(res.body.resource).toBe(getMcpResourceUrl());
    expect(res.body.authorization_servers).toHaveLength(1);
  });

  test("redirects humans to the documentation", async () => {
    const res = await request(app).get("/").set("Accept", "text/html");
    expect(res.status).toBe(302);
    expect(res.headers["location"]).toContain("argos-ci.com/docs");
  });

  test("responds 405 to MCP clients probing the SSE stream", async () => {
    const res = await request(app).get("/").set("Accept", "text/event-stream");
    expect(res.status).toBe(405);
    expect(res.headers["allow"]).toBe("POST");
  });

  test("responds 405 to DELETE (stateless, no session to terminate)", async () => {
    const res = await request(app).delete("/");
    expect(res.status).toBe(405);
    expect(res.headers["allow"]).toBe("POST");
  });

  test("lists the derived tools with a PAT", async ({ patToken }) => {
    const res = await rpc(patToken, "tools/list");
    expect(res.status).toBe(200);
    const body = res.body as RpcResponse;
    const names = body.result!.tools!.map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining(["getMe", "listBuilds", "createReview"]),
    );
    expect(names).not.toContain("createBuild");
  });

  test("calls getMe with a PAT", async ({ patToken, userAccount }) => {
    const res = await rpc(patToken, "tools/call", {
      name: "getMe",
      arguments: {},
    });
    expect(res.status).toBe(200);
    const body = res.body as RpcResponse;
    expect(body.result!.isError).toBeUndefined();
    expect(body.result!.structuredContent).toEqual({
      id: userAccount.id,
      slug: "jane-doe",
      name: "Jane Doe",
    });
  });

  test("calls listBuilds with a PAT", async ({
    patToken,
    project: _project,
  }) => {
    const res = await rpc(patToken, "tools/call", {
      name: "listBuilds",
      arguments: {
        owner: "jane-doe",
        project: "awesome-project",
        perPage: "10",
      },
    });
    expect(res.status).toBe(200);
    const body = res.body as RpcResponse;
    expect(body.result!.isError).toBeUndefined();
    expect(body.result!.structuredContent).toMatchObject({
      results: [],
      pageInfo: { total: 0, page: 1, perPage: 10 },
    });
  });

  test("calls a write tool with a JSON body (createProject)", async ({
    patToken,
  }) => {
    const res = await rpc(patToken, "tools/call", {
      name: "createProject",
      arguments: { name: "mcp-created", accountSlug: "jane-doe" },
    });
    expect(res.status).toBe(200);
    const body = res.body as RpcResponse;
    expect(body.result!.isError).toBeUndefined();
    expect(body.result!.structuredContent).toMatchObject({
      name: "mcp-created",
    });
    const project = await Project.query().findOne({ name: "mcp-created" });
    expect(project).toBeDefined();
    // Proves the module mock intercepts through the loopback dispatch — a
    // real Discord webhook must never fire from tests.
    expect(vi.mocked(notifyDiscord)).toHaveBeenCalled();
  });

  test("rejects invalid tool arguments", async ({ patToken }) => {
    const res = await rpc(patToken, "tools/call", {
      name: "listBuilds",
      arguments: { owner: "jane-doe" },
    });
    expect(res.status).toBe(200);
    const body = res.body as RpcResponse;
    // The SDK validates arguments against the same Zod schemas as the API and
    // surfaces failures as tool errors.
    expect(body.result!.isError).toBe(true);
    expect(body.result!.content![0]!.text).toMatch(/input validation error/i);
  });

  test("enforces OAuth scopes per tool call", async ({
    userAccount,
    project: _project,
  }) => {
    const token = await createOAuthAccessToken({
      userAccount,
      scopes: ["profile"],
      resource: getMcpResourceUrl(),
    });

    // `getMe` requires `profile` — allowed.
    const meRes = await rpc(token, "tools/call", {
      name: "getMe",
      arguments: {},
    });
    expect((meRes.body as RpcResponse).result!.isError).toBeUndefined();

    // `listBuilds` requires `projects:read` — rejected by the API layer.
    const buildsRes = await rpc(token, "tools/call", {
      name: "listBuilds",
      arguments: { owner: "jane-doe", project: "awesome-project" },
    });
    const body = buildsRes.body as RpcResponse;
    expect(body.result!.isError).toBe(true);
    expect(body.result!.content![0]!.text).toContain("Insufficient scope");
    expect(body.result!.content![0]!.text).toContain("projects:read");
  });

  test("accepts OAuth tokens bound to the REST API resource", async ({
    userAccount,
  }) => {
    const token = await createOAuthAccessToken({
      userAccount,
      scopes: ["profile"],
      resource: getApiResourceUrl(),
    });
    const res = await rpc(token, "tools/list");
    expect(res.status).toBe(200);
  });

  test("rejects OAuth tokens bound to a foreign resource", async ({
    userAccount,
  }) => {
    const token = await createOAuthAccessToken({
      userAccount,
      scopes: ["profile"],
      resource: "https://evil.example",
    });
    const res = await rpc(token, "tools/list");
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("not issued for this resource");
    expect(res.headers["www-authenticate"]).toContain(
      "oauth-protected-resource",
    );
  });

  test("returns an error for an unknown tool", async ({ patToken }) => {
    const res = await rpc(patToken, "tools/call", {
      name: "doesNotExist",
      arguments: {},
    });
    expect(res.status).toBe(200);
    const body = res.body as RpcResponse;
    expect(body.result!.isError).toBe(true);
    expect(body.result!.content![0]!.text).toMatch(/not found/i);
  });
});
