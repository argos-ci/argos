/**
 * The MCP server itself: registers the derived tool definitions and routes
 * tool calls through the dispatch layer.
 *
 * Tools are registered with their Zod schemas: the SDK converts them to JSON
 * Schema for `tools/list` and validates arguments and structured results, so
 * MCP clients get the exact same validation the REST API applies.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { callTool } from "./dispatch";
import { mcpTools } from "./tools";

const MCP_INSTRUCTIONS = `Argos is a visual testing platform: CI uploads screenshots as "builds", Argos diffs them against a baseline, and users review and approve or reject the detected changes.

Projects are identified by an "owner" (account slug) and a "project" (project name), as in the URL https://app.argos-ci.com/{owner}/{project}. Builds are identified by their per-project "buildNumber". List endpoints are paginated with "page" and "perPage" arguments.`;

/**
 * Create an MCP server bound to the caller's authorization. One instance per
 * request (the transport is stateless).
 */
export function createMcpServer(context: { authorization: string }): McpServer {
  const server = new McpServer(
    { name: "argos", title: "Argos", version: "2.0.0" },
    { instructions: MCP_INSTRUCTIONS },
  );

  for (const tool of mcpTools) {
    server.registerTool(
      tool.name,
      {
        ...(tool.title ? { title: tool.title } : {}),
        description: tool.description,
        inputSchema: tool.inputSchema,
        ...(tool.outputSchema ? { outputSchema: tool.outputSchema } : {}),
        annotations: tool.annotations,
      },
      (args) =>
        callTool(tool, args as Record<string, unknown>, context.authorization),
    );
  }

  return server;
}
