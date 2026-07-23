/**
 * The MCP server itself: registers the derived tool definitions and routes
 * tool calls through the dispatch layer.
 *
 * Tools are registered with their Zod schemas: the SDK converts them to JSON
 * Schema for `tools/list` and validates arguments and structured results, so
 * MCP clients get the exact same validation the REST API applies.
 */
import { trimTrailingSlash } from "@argos/util/url";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

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

  registerSkillResources(server);

  return server;
}

/**
 * Expose the published Argos skills (from `argos-javascript`, the same source
 * `npx skills add` installs) as MCP resources, so an MCP client on
 * `mcp.argos-ci.com` discovers them via `resources/list` and reads a
 * `SKILL.md` on demand.
 *
 * Registration is a single lazy resource template: servers are created per
 * request, so the skills must never be fetched at creation time — the registry
 * (cached, stale-on-error) is only hit when a client actually calls
 * `resources/list` or `resources/read`.
 */
function registerSkillResources(server: McpServer): void {
  const appOrigin = trimTrailingSlash(config.get("server.url"));
  // The canonical, dereferenceable location — the same URL `npx skills add`
  // resolves — even though the content is fetched from the repo on read.
  const skillUri = (name: string) =>
    `${appOrigin}/.well-known/agent-skills/${name}/SKILL.md`;

  server.registerResource(
    "skill",
    new ResourceTemplate(skillUri("{skill}"), {
      // A listing failure degrades to "no skills" instead of erroring the
      // whole resources/list call.
      list: async () => {
        const skills = await getSkills().catch(() => []);
        return {
          resources: skills.map((skill) => ({
            uri: skillUri(skill.name),
            name: skill.name,
            description: skill.description,
            mimeType: "text/markdown",
          })),
        };
      },
    }),
    {
      title: "Argos agent skills",
      description:
        "Installable agent skills published by Argos (also served at /.well-known/agent-skills).",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const name = String(variables["skill"]);
      const skills = await getSkills();
      const skill = skills.find((s) => s.name === name);
      if (!skill) {
        throw new Error(`Unknown Argos skill: ${name}`);
      }
      const response = await fetch(getSkillFileUrl(skill.name, "SKILL.md"));
      if (!response.ok) {
        throw new Error(`Failed to load the "${name}" skill`);
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: await response.text(),
          },
        ],
      };
    },
  );
}
