import { describe, expect, it } from "vitest";
import { z } from "zod";

import { schema } from "@/api/schema";
import { getMcpResourceUrl } from "@/oauth/metadata";

import { buildMcpTools, mcpTools } from "./tools";

describe("buildMcpTools", () => {
  it("derives the tool surface from the OpenAPI document", () => {
    // This snapshot locks the MCP tool surface: it changes whenever an
    // operation is added to (or removed from) the OpenAPI document with a
    // security declaration accepting a personal access token or OAuth.
    expect(mcpTools.map((tool) => tool.name).sort()).toMatchInlineSnapshot(`
      [
        "addCommentReaction",
        "createComment",
        "createProject",
        "createReview",
        "deleteComment",
        "dismissReview",
        "getAccountAnalytics",
        "getBuild",
        "getComment",
        "getMe",
        "getProject",
        "ignoreChange",
        "listBuildDiffs",
        "listBuilds",
        "listComments",
        "listProjects",
        "listReviews",
        "removeCommentReaction",
        "resolveCommentThread",
        "subscribeCommentThread",
        "unignoreChange",
        "unresolveCommentThread",
        "unsubscribeCommentThread",
        "updateComment",
      ]
    `);
  });

  it("excludes project-token-only, internal and public operations", () => {
    const names = new Set(mcpTools.map((tool) => tool.name));
    for (const excluded of [
      // Project-token-only (CI/SDK) operations.
      "createBuild",
      "updateBuild",
      "finalizeBuilds",
      "findBaseline",
      "getAuthProject",
      "createDeployment",
      "finalizeDeployment",
      "getDeployment",
      // Internal token-exchange operations.
      "exchangeCliToken",
      "exchangeGitHubActionsOidcToken",
      "exchangeGitHubActionsTokenlessToken",
      // Public operations.
      "resolveDeploymentDomain",
    ]) {
      expect(names.has(excluded), `${excluded} should be excluded`).toBe(false);
    }
  });

  it("projects listBuilds with merged input schema and metadata", () => {
    const tool = mcpTools.find((tool) => tool.name === "listBuilds");
    expect(tool).toBeDefined();
    expect(tool).toMatchObject({
      method: "get",
      path: "/projects/{owner}/{project}/builds",
      pathKeys: ["owner", "project"],
      requiredScopes: ["projects:read"],
      hasBody: false,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    });
    expect(tool!.description).toContain("projects:read");

    // Convert like the MCP SDK does for `tools/list` (`io: "input"`).
    const inputSchema = z.toJSONSchema(tool!.inputSchema, {
      io: "input",
      unrepresentable: "any",
    }) as {
      type: string;
      properties: Record<string, { type?: string }>;
      required?: string[];
    };
    expect(inputSchema.type).toBe("object");
    expect(inputSchema.required).toEqual(
      expect.arrayContaining(["owner", "project"]),
    );
    // Query params keep their HTTP wire type (strings), matching what the
    // dispatch serializes into the query string.
    expect(inputSchema.properties["page"]?.type).toBe("string");
    expect(inputSchema.properties["perPage"]?.type).toBe("string");

    expect(tool!.outputSchema).toBeInstanceOf(z.ZodObject);
  });

  it("nests body keys for operations with a JSON object body", () => {
    const tool = mcpTools.find((tool) => tool.name === "createReview");
    expect(tool).toBeDefined();
    expect(tool!.hasBody).toBe(true);
    expect(tool!.bodyKeys).toEqual(
      expect.arrayContaining(["event", "conclusion"]),
    );
    // Path params and body keys are merged flat into a single argument object.
    expect(Object.keys(tool!.inputSchema.shape)).toEqual(
      expect.arrayContaining(["owner", "project", "buildNumber", "event"]),
    );
  });

  it("throws on a parameter key collision", () => {
    const operation = {
      operationId: "collide",
      summary: "Colliding operation",
      security: [{ personalAccessToken: [] }],
      requestParams: {
        path: z.object({ owner: z.string() }),
        query: z.object({ owner: z.string() }),
      },
      responses: {},
    };
    expect(() =>
      buildMcpTools({ "/collide/{owner}": { get: operation } }),
    ).toThrow(/parameter key collision on "owner"/);
  });

  it("throws on duplicate tool names", () => {
    const operation = {
      operationId: "dupe",
      summary: "Duplicate operation",
      security: [{ personalAccessToken: [] }],
      responses: {},
    };
    expect(() =>
      buildMcpTools({
        "/a": { get: operation },
        "/b": { get: operation },
      }),
    ).toThrow(/Duplicate MCP tool name "dupe"/);
  });

  it("respects the x-mcp opt-out", () => {
    const operation = {
      operationId: "hidden",
      summary: "Hidden operation",
      security: [{ personalAccessToken: [] }],
      responses: {},
      "x-mcp": { enabled: false },
    };
    expect(buildMcpTools({ "/hidden": { get: operation } })).toEqual([]);
  });

  it("applies x-mcp name and description overrides", () => {
    const operation = {
      operationId: "uglyInternalName",
      summary: "Some operation",
      description: "Original description.",
      security: [{ personalAccessToken: [] }],
      responses: {},
      "x-mcp": { name: "niceName", description: "Agent-facing description." },
    };
    const [tool] = buildMcpTools({ "/thing": { get: operation } });
    expect(tool!.name).toBe("niceName");
    expect(tool!.description).toBe("Agent-facing description.");
  });
});

describe("x-gitbook-mcp stamping", () => {
  it("marks exactly the MCP-eligible operations in the OpenAPI document", () => {
    const methods = ["get", "post", "put", "patch", "delete"] as const;
    const marked: string[] = [];
    for (const [path, pathItem] of Object.entries(schema.paths ?? {})) {
      for (const method of methods) {
        const operation = pathItem[method] as
          { operationId?: string; "x-gitbook-mcp"?: boolean } | undefined;
        if (operation?.["x-gitbook-mcp"]) {
          marked.push(operation.operationId ?? `${method} ${path}`);
        }
      }
    }
    // The marker is computed from each operation's `security`, with the same
    // predicate used to derive the tools — the two can never disagree.
    expect(marked.sort()).toEqual(mcpTools.map((tool) => tool.name).sort());
  });

  it("does not mark project-token-only or internal operations", () => {
    const createBuild = schema.paths?.["/builds"]?.post as
      Record<string, unknown> | undefined;
    expect(createBuild).toBeDefined();
    expect(createBuild!["x-gitbook-mcp"]).toBeUndefined();
    const exchangeCliToken = schema.paths?.["/auth/cli/token"]?.post as
      Record<string, unknown> | undefined;
    expect(exchangeCliToken).toBeDefined();
    expect(exchangeCliToken!["x-gitbook-mcp"]).toBeUndefined();
  });

  it("advertises the MCP server URL at the document root", () => {
    expect(
      (schema as unknown as Record<string, unknown>)["x-gitbook-mcp-url"],
    ).toBe(getMcpResourceUrl());
  });
});
