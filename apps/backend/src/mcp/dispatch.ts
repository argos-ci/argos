/**
 * Executes MCP tool calls by routing HTTP requests through the existing
 * OpenAPI Express router. The API layer stays the single source of truth:
 * request validation, authentication, OAuth scope enforcement, serialization
 * and error formatting are all reused verbatim.
 *
 * Requests go through a private HTTP server bound to the loopback interface
 * (never exposed): it runs the OpenAPI router without the public `api`
 * subdomain matching or the public `/v2` rate limiter (the MCP endpoint has
 * its own), and every request re-authenticates with the caller's bearer.
 */
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import express from "express";

import { openAPIRouter } from "@/api/index";
import {
  markAcceptedOAuthResources,
  markSkipUsageTracking,
} from "@/auth/oauth-access-token";
import { getApiResourceUrl, getMcpResourceUrl } from "@/oauth/metadata";

import type { McpToolDefinition } from "./tools";

function createInternalApp(): express.Express {
  // No rate limiter here on purpose: this app binds to the loopback interface
  // and is only reachable through the MCP endpoint, which is rate-limited.
  const app = express();
  app.use((req, _res, next) => {
    // Tool calls come from the MCP server, so tokens bound to either the MCP
    // resource or the REST API resource are acceptable.
    markAcceptedOAuthResources(req, [getMcpResourceUrl(), getApiResourceUrl()]);
    // The outer MCP request already authenticated the same bearer and recorded
    // its usage, so skip the redundant `lastUsedAt` writes on this re-auth.
    markSkipUsageTracking(req);
    next();
  });
  app.use(openAPIRouter);
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      res.status(500).json({ error: message });
    },
  );
  return app;
}

let internalBaseUrl: Promise<string> | null = null;

/** Lazily start the loopback dispatch server, once per process. */
function getInternalBaseUrl(): Promise<string> {
  internalBaseUrl ??= new Promise<string>((resolve, reject) => {
    const server = createServer(createInternalApp());
    // Never keep the process alive because of the dispatch server.
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve(`http://127.0.0.1:${port}`);
    });
  }).catch((error: unknown) => {
    // Don't cache the failure: clearing the memo lets the next call retry
    // instead of every future tool call awaiting the same rejected promise.
    internalBaseUrl = null;
    throw error;
  });
  return internalBaseUrl;
}

function textResult(text: string, isError?: boolean): CallToolResult {
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : {}),
  };
}

/**
 * Execute a tool call by routing it through the OpenAPI router with the
 * caller's bearer token. Returns an MCP tool result; API errors become
 * `isError` results carrying the API's own error message.
 */
export async function callTool(
  tool: McpToolDefinition,
  args: Record<string, unknown>,
  authorization: string,
): Promise<CallToolResult> {
  // Build the URL from the OpenAPI path template.
  let url = tool.path;
  for (const key of tool.pathKeys) {
    const value = args[key];
    if (value === undefined || value === null || value === "") {
      return textResult(`Missing required parameter "${key}".`, true);
    }
    url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
  }

  const searchParams = new URLSearchParams();
  for (const key of tool.queryKeys) {
    const value = args[key];
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, String(item));
      }
    } else {
      searchParams.append(key, String(value));
    }
  }
  const queryString = searchParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  let body: unknown;
  if (tool.hasBody) {
    if (tool.bodyKeys === null) {
      body = args["body"];
    } else {
      const picked: Record<string, unknown> = {};
      for (const key of tool.bodyKeys) {
        if (args[key] !== undefined) {
          picked[key] = args[key];
        }
      }
      body = picked;
    }
  }

  const baseUrl = await getInternalBaseUrl();
  const response = await fetch(`${baseUrl}${url}`, {
    method: tool.method.toUpperCase(),
    headers: {
      authorization,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.text();

  if (response.ok) {
    if (!payload) {
      // No response body (e.g. a 204). When the tool declares an output
      // schema the MCP SDK requires a matching `structuredContent`, so an
      // empty body is an anomaly we surface as an error rather than letting
      // the SDK throw on a missing structured result.
      if (tool.outputSchema) {
        return textResult(
          `${tool.name} returned an empty response body but declares structured output.`,
          true,
        );
      }
      return textResult(JSON.stringify({ success: true }));
    }
    if (!tool.outputSchema) {
      return { content: [{ type: "text", text: payload }] };
    }
    let structuredContent: Record<string, unknown>;
    try {
      structuredContent = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      // A 2xx body that isn't parseable JSON can't satisfy the declared
      // output schema; return a clean error instead of throwing out of the
      // tool handler.
      return textResult(
        `${tool.name} returned a response that could not be parsed as JSON.`,
        true,
      );
    }
    return {
      content: [{ type: "text", text: payload }],
      structuredContent,
    };
  }

  return textResult(
    `${tool.name} failed (HTTP ${response.status}): ${formatApiError(payload)}`,
    true,
  );
}

/** Format the API error payload (`{ error, details }`, see api/util.ts). */
function formatApiError(payload: string): string {
  try {
    const parsed = JSON.parse(payload) as {
      error?: string;
      details?: { message?: string }[];
    };
    const message = parsed.error ?? payload;
    const details = (parsed.details ?? [])
      .map((detail) => detail.message)
      .filter(Boolean);
    return details.length > 0 ? `${message} — ${details.join("; ")}` : message;
  } catch {
    return payload || "Unknown error";
  }
}
