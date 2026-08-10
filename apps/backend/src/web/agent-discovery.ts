/**
 * Agent-discovery documents on the app origin. `argos-ci.com` redirects
 * `/.well-known/*` here, so these are the documents agents find when they
 * probe the marketing domain:
 *
 * - `/.well-known/api-catalog` (RFC 9727): a linkset (RFC 9264) of the Argos
 *   APIs — the REST API and the MCP server — with their OpenAPI description,
 *   documentation, status and OAuth metadata.
 * - `/.well-known/oauth-protected-resource` (RFC 9728): the REST API's
 *   Protected Resource Metadata (the API origin serves the canonical copy).
 * - `/.well-known/mcp/server-card.json` (SEP-1649): the MCP Server Card (the
 *   MCP origin serves the canonical copy).
 * - `/auth.md`: the agent-registration recipe (`argos-ci.com/auth.md` proxies
 *   it), pointed at by `agent_auth.skill` in the authorization server metadata.
 *
 * Everything is derived from config and the shared oauth/mcp modules, so the
 * documents cannot disagree with the servers they describe. Mounted on the app
 * subdomain BEFORE the SPA static handler and catch-all.
 */
import cors from "cors";
import { Router } from "express";

import { getServerCard, MCP_DOCS_URL } from "@/mcp/server-card";
import { getAuthMd } from "@/oauth/auth-md";
import {
  getApiResourceUrl,
  getMcpProtectedResourceMetadataUrl,
  getMcpResourceUrl,
  getProtectedResourceMetadata,
  getProtectedResourceMetadataUrl,
} from "@/oauth/metadata";

const API_DOCS_URL = "https://argos-ci.com/docs/api-reference";

/** RFC 9727 API catalog, as an RFC 9264 linkset. */
function getApiCatalog() {
  const apiUrl = getApiResourceUrl();
  const mcpUrl = getMcpResourceUrl();
  // The API health endpoint lives at the origin root, not under /v2.
  const statusUrl = new URL("/status", apiUrl).toString();
  return {
    linkset: [
      {
        anchor: apiUrl,
        "service-desc": [
          { href: `${apiUrl}/openapi.yaml`, type: "application/yaml" },
        ],
        "service-doc": [{ href: API_DOCS_URL, type: "text/html" }],
        "service-meta": [
          { href: getProtectedResourceMetadataUrl(), type: "application/json" },
        ],
        status: [{ href: statusUrl }],
      },
      {
        anchor: mcpUrl,
        "service-doc": [{ href: MCP_DOCS_URL, type: "text/html" }],
        "service-meta": [
          {
            href: `${mcpUrl}/.well-known/mcp/server-card.json`,
            type: "application/json",
          },
          {
            href: getMcpProtectedResourceMetadataUrl(),
            type: "application/json",
          },
        ],
        status: [{ href: statusUrl }],
      },
    ],
  };
}

export function installAgentDiscoveryRoutes(router: Router): void {
  const wellKnown = Router();

  wellKnown.use(cors({ origin: "*" }));

  wellKnown.get("/api-catalog", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("application/linkset+json");
    res.json(getApiCatalog());
  });

  wellKnown.get("/oauth-protected-resource", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json(getProtectedResourceMetadata());
  });

  wellKnown.get("/mcp/server-card.json", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json(getServerCard());
  });

  router.use("/.well-known", wellKnown);

  // Auth.md: the registration recipe `agent_auth.skill` points at.
  // `argos-ci.com/auth.md` proxies this document.
  router.get("/auth.md", cors({ origin: "*" }), (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("text/markdown");
    res.send(getAuthMd());
  });
}
