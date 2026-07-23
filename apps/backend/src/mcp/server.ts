/**
 * The MCP server itself: registers the derived tool definitions and routes
 * tool calls through the dispatch layer.
 *
 * Tools are registered with their Zod schemas: the SDK converts them to JSON
 * Schema for `tools/list` and validates arguments and structured results, so
 * MCP clients get the exact same validation the REST API applies.
 */
import { trimTrailingSlash } from "@argos/util/url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import config from "@/config";
import { getSkillFileUrl, getSkills } from "@/skills/registry";

import { callTool } from "./dispatch";
import { mcpTools } from "./tools";

const MCP_INSTRUCTIONS = `Argos is a visual testing platform: CI uploads screenshots as "builds", Argos diffs them against a baseline, and users review and approve or reject the detected changes.

Call "getMe" first: it returns the authenticated user and the accounts (personal and teams) the token can access, whose slugs are the "owner" used by the other tools.

Projects are identified by an "owner" (account slug) and a "project" (project name), as in the URL https://app.argos-ci.com/{owner}/{project}. Builds are identified by their per-project "buildNumber". List endpoints are paginated with "page" and "perPage" arguments.`;

/**
 * Create an MCP server bound to the caller's authorization. One instance per
 * request (the transport is stateless).
 */
export async function createMcpServer(context: {
  authorization: string;
}): Promise<McpServer> {
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

  await registerSkillResources(server);

  return server;
}

/**
 * Expose the published Argos skills (from `argos-javascript`, the same source
 * `npx skills add` installs) as MCP resources, so an MCP client on
 * `mcp.argos-ci.com` discovers them via `resources/list` and reads the
 * `SKILL.md` on demand. Never fail server creation if the skills can't load.
 */
async function registerSkillResources(server: McpServer): Promise<void> {
  const skills = await getSkills().catch(() => []);
  const appOrigin = trimTrailingSlash(config.get("server.url"));
  for (const skill of skills) {
    // The canonical, dereferenceable location — the same URL `npx skills add`
    // resolves — even though the content is fetched from the repo below.
    const uri = `${appOrigin}/.well-known/agent-skills/${skill.name}/SKILL.md`;
    server.registerResource(
      skill.name,
      uri,
      {
        title: skill.name,
        description: skill.description,
        mimeType: "text/markdown",
      },
      async (resourceUri) => {
        const response = await fetch(getSkillFileUrl(skill.name, "SKILL.md"));
        return {
          contents: [
            {
              uri: resourceUri.href,
              mimeType: "text/markdown",
              text: response.ok ? await response.text() : "",
            },
          ],
        };
      },
    );
  }
}
