/**
 * MCP Server Card (SEP-1649): a static discovery document served at
 * `/.well-known/mcp/server-card.json` on the MCP origin, letting clients find
 * the endpoint, transport and OAuth entry point before connecting.
 *
 * The card format is still being standardized
 * (https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127), so
 * the document carries both the SEP-1649 fields (`serverInfo`, `endpoint`,
 * `transport`, `capabilities`) and the MCP registry `server.json` style fields
 * (`name`, `remotes`). This is the canonical card: the marketing site serves a
 * copy at `argos-ci.com/.well-known/mcp/server-card.json`.
 *
 * `serverInfo` is the very object the server hands to the SDK, and the e2e
 * test pins `serverInfo` and `capabilities` to a live `initialize` response,
 * so the card cannot drift from runtime behavior.
 */
import {
  getMcpProtectedResourceMetadataUrl,
  getMcpResourceUrl,
} from "@/oauth/metadata";

import { MCP_SERVER_INFO } from "./server";

export const MCP_DOCS_URL = "https://argos-ci.com/docs/agents/mcp-server";

export function getServerCard() {
  const endpoint = getMcpResourceUrl();
  return {
    name: `com.argos-ci/${MCP_SERVER_INFO.name}`,
    title: MCP_SERVER_INFO.title,
    description:
      "Official MCP server for Argos, the visual testing platform. Exposes the Argos REST API as tools: inspect builds and screenshot diffs, approve or reject reviews, manage teams, projects, and automations.",
    version: MCP_SERVER_INFO.version,
    websiteUrl: "https://argos-ci.com",
    documentationUrl: MCP_DOCS_URL,
    repository: {
      url: "https://github.com/argos-ci/argos",
      source: "github",
    },
    serverInfo: MCP_SERVER_INFO,
    endpoint,
    transport: {
      type: "streamable-http",
      endpoint,
    },
    remotes: [
      {
        type: "streamable-http",
        url: endpoint,
        authentication: {
          type: "oauth2",
          resourceMetadata: getMcpProtectedResourceMetadataUrl(),
        },
      },
    ],
    // What `initialize` actually reports: the SDK declares `listChanged` for
    // registered tools and resources (even though the stateless transport
    // never delivers change notifications).
    capabilities: {
      tools: { listChanged: true },
      resources: { listChanged: true },
    },
  };
}
