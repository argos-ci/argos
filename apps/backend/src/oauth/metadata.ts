import { trimTrailingSlash } from "@argos/util/url";

import config from "@/config";

import { OAUTH_SCOPE_LIST } from "./scopes";

/**
 * The OAuth issuer / Authorization Server base URL (the app origin, where login
 * and consent live).
 */
export function getOAuthIssuer(): string {
  return trimTrailingSlash(config.get("server.url"));
}

/** The API origin (Resource Server host), without the `/v2` prefix. */
function getApiOrigin(): string {
  return trimTrailingSlash(config.get("api.baseUrl"));
}

/** The canonical resource identifier (audience) for the REST API. */
export function getApiResourceUrl(): string {
  return `${getApiOrigin()}/v2`;
}

/** URL of the REST API's Protected Resource Metadata document. */
export function getProtectedResourceMetadataUrl(): string {
  return `${getApiOrigin()}/.well-known/oauth-protected-resource`;
}

/**
 * The canonical resource identifier (audience) for the MCP server, which lives
 * on its own subdomain (e.g. `https://mcp.argos-ci.com`).
 */
export function getMcpResourceUrl(): string {
  return trimTrailingSlash(config.get("mcp.baseUrl"));
}

/** URL of the MCP server's Protected Resource Metadata document. */
export function getMcpProtectedResourceMetadataUrl(): string {
  return `${getMcpResourceUrl()}/.well-known/oauth-protected-resource`;
}

/**
 * Normalize an RFC 8707 resource identifier for comparison and storage.
 * Clients canonicalize URLs (e.g. `new URL(...)` appends a trailing slash to
 * an origin), so `https://mcp.argos-ci.com/` and `https://mcp.argos-ci.com`
 * must identify the same resource.
 */
export function normalizeResource(resource: string): string {
  return trimTrailingSlash(resource);
}

/** Resource identifiers (RFC 8707 audiences) the Authorization Server issues tokens for. */
export function isKnownResource(resource: string): boolean {
  return [getApiResourceUrl(), getMcpResourceUrl()].includes(
    normalizeResource(resource),
  );
}

/**
 * RFC 8414 Authorization Server Metadata.
 */
export function getAuthorizationServerMetadata() {
  const issuer = getOAuthIssuer();
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    introspection_endpoint: `${issuer}/oauth/introspect`,
    revocation_endpoint: `${issuer}/oauth/revoke`,
    scopes_supported: OAUTH_SCOPE_LIST,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: [
      "none",
      "client_secret_basic",
      "client_secret_post",
    ],
    service_documentation: "https://argos-ci.com/docs/api-reference",
  };
}

/**
 * RFC 9728 Protected Resource Metadata. Defaults to the REST API resource;
 * the MCP server passes its own resource identifier.
 */
export function getProtectedResourceMetadata(resource?: string) {
  return {
    resource: resource ?? getApiResourceUrl(),
    authorization_servers: [getOAuthIssuer()],
    scopes_supported: OAUTH_SCOPE_LIST,
    bearer_methods_supported: ["header"],
  };
}
