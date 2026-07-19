/**
 * MCP tool definitions derived from the OpenAPI document.
 *
 * The whole tool surface is generated at module load from {@link zodSchema}:
 * one tool per operation that a user token (personal access token or OAuth
 * access token) can call. There is no per-endpoint MCP code — adding an
 * operation to the OpenAPI document automatically adds the matching tool.
 *
 * Operations can customize their MCP projection with the `x-mcp` extension
 * ({@link XMcpExtension}): opt out entirely, or override the tool name and
 * agent-facing description.
 */
import { z } from "zod";

import { zodSchema } from "@/api/schema";
import type { OAuthScope } from "@/oauth/scopes";

import { isMcpEligible, type XMcpExtension } from "./eligibility";

type McpHttpMethod = "get" | "post" | "put" | "patch" | "delete";

const HTTP_METHODS: McpHttpMethod[] = ["get", "post", "put", "patch", "delete"];

export type McpToolDefinition = {
  // -- Wire fields, sent to MCP clients --
  name: string;
  title: string | undefined;
  description: string;
  /**
   * Zod schemas, passed to the MCP SDK as-is: it converts them to JSON Schema
   * for `tools/list` (`io: "input"` for inputs, `io: "output"` for outputs)
   * and validates `tools/call` arguments and structured results against them.
   */
  inputSchema: z.ZodObject;
  outputSchema: z.ZodObject | undefined;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  };
  // -- Dispatch metadata, never sent to clients --
  method: McpHttpMethod;
  /** OpenAPI path template, e.g. `/projects/{owner}/{project}/builds`. */
  path: string;
  pathKeys: string[];
  queryKeys: string[];
  /**
   * Top-level keys of the JSON request body, or `null` when the body is not an
   * object schema and is nested under a literal `body` argument instead.
   */
  bodyKeys: string[] | null;
  /** `null` when the body schema is absent. */
  hasBody: boolean;
  requiredScopes: OAuthScope[] | null;
};

const TOOL_NAME_RE = /^[a-zA-Z0-9_-]{1,128}$/;

type AnyOperation = {
  operationId?: string;
  summary?: string;
  description?: string;
  security?: readonly Record<string, unknown>[];
  requestParams?: {
    path?: unknown;
    query?: unknown;
  };
  requestBody?: {
    content?: Record<string, { schema?: unknown }>;
  };
  responses?: Record<string, unknown>;
  "x-internal"?: boolean;
  "x-mcp"?: XMcpExtension;
};

function getRequiredScopes(operation: AnyOperation): OAuthScope[] | null {
  for (const requirement of operation.security ?? []) {
    const scopes = requirement["oauth2"];
    if (Array.isArray(scopes)) {
      return scopes as OAuthScope[];
    }
  }
  return null;
}

function asZodObject(value: unknown): z.ZodObject | null {
  return value instanceof z.ZodObject ? value : null;
}

function getJsonBodySchema(operation: AnyOperation): z.ZodType | null {
  const schema = operation.requestBody?.content?.["application/json"]?.schema;
  return schema instanceof z.ZodType ? schema : null;
}

/**
 * The tool's output schema: the first 2xx JSON response schema, when it is an
 * object (MCP output schemas must describe an object).
 */
function getOutputSchema(operation: AnyOperation): z.ZodObject | undefined {
  for (const [status, response] of Object.entries(operation.responses ?? {})) {
    if (!/^2\d\d$/.test(status)) {
      continue;
    }
    const content = (
      response as { content?: Record<string, { schema?: unknown }> }
    ).content;
    const schema = asZodObject(content?.["application/json"]?.schema);
    if (schema) {
      return schema;
    }
  }
  return undefined;
}

function buildTool(
  path: string,
  method: McpHttpMethod,
  operation: AnyOperation,
): McpToolDefinition {
  const operationId = operation.operationId;
  if (!operationId) {
    throw new Error(`MCP tool for "${method} ${path}" has no operationId`);
  }

  const xMcp = operation["x-mcp"];
  const name = xMcp?.name ?? operationId;
  if (!TOOL_NAME_RE.test(name)) {
    throw new Error(`MCP tool name "${name}" is invalid`);
  }

  // Merge path params, query params and body keys into a single flat argument
  // object. A key collision would make dispatch ambiguous, so it is a build
  // failure — caught at boot and by unit tests.
  const shape: Record<string, z.ZodType> = {};
  const sources = new Map<string, string>();
  const merge = (object: z.ZodObject | null, source: string): string[] => {
    if (!object) {
      return [];
    }
    const keys = Object.keys(object.shape);
    for (const key of keys) {
      const existing = sources.get(key);
      if (existing) {
        throw new Error(
          `MCP tool ${name}: parameter key collision on "${key}" (${existing} and ${source})`,
        );
      }
      sources.set(key, source);
      shape[key] = object.shape[key] as z.ZodType;
    }
    return keys;
  };

  const pathKeys = merge(asZodObject(operation.requestParams?.path), "path");
  const queryKeys = merge(asZodObject(operation.requestParams?.query), "query");

  const bodySchema = getJsonBodySchema(operation);
  const bodyObject = asZodObject(bodySchema);
  let bodyKeys: string[] | null = null;
  if (bodyObject) {
    bodyKeys = merge(bodyObject, "body");
  } else if (bodySchema) {
    // Non-object body: nest it under a literal `body` argument.
    merge(z.object({ body: bodySchema }), "body");
  }

  // The MCP SDK converts these schemas to JSON Schema on every `tools/list`.
  // Validate the conversion once at build time so a non-representable schema
  // (e.g. a `.transform()` in a response) fails unit tests and boot, not
  // clients at runtime.
  const inputSchema = z.object(shape);
  const outputSchema = getOutputSchema(operation);
  try {
    z.toJSONSchema(inputSchema, { io: "input" });
    if (outputSchema) {
      z.toJSONSchema(outputSchema, { io: "output" });
    }
  } catch (error) {
    throw new Error(
      `MCP tool ${name}: schema cannot be represented as JSON Schema: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }

  const requiredScopes = getRequiredScopes(operation);
  const description =
    xMcp?.description ??
    [
      operation.summary,
      operation.description,
      requiredScopes
        ? `Requires the OAuth scope(s): ${requiredScopes.join(", ")} (personal access tokens are not scope-restricted).`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

  return {
    name,
    title: operation.summary,
    description,
    inputSchema,
    outputSchema,
    annotations: {
      readOnlyHint: method === "get",
      destructiveHint: method === "delete",
      idempotentHint:
        method === "get" || method === "put" || method === "delete",
      openWorldHint: false,
    },
    method,
    path,
    pathKeys,
    queryKeys,
    bodyKeys,
    hasBody: bodySchema !== null,
    requiredScopes,
  };
}

/**
 * Build the MCP tool definitions from the OpenAPI document. Deterministic —
 * exported for tests; use {@link mcpTools} instead.
 */
export function buildMcpTools(
  paths: Record<string, Record<string, unknown>> = zodSchema.paths,
): McpToolDefinition[] {
  const tools: McpToolDefinition[] = [];
  const names = new Set<string>();
  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as AnyOperation | undefined;
      if (!operation || !isMcpEligible(operation)) {
        continue;
      }
      const tool = buildTool(path, method, operation);
      if (names.has(tool.name)) {
        throw new Error(`Duplicate MCP tool name "${tool.name}"`);
      }
      names.add(tool.name);
      tools.push(tool);
    }
  }
  return tools;
}

/** The MCP tool surface, derived once at module load. */
export const mcpTools: readonly McpToolDefinition[] =
  Object.freeze(buildMcpTools());
