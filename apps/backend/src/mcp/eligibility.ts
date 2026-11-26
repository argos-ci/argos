/**
 * MCP eligibility of an OpenAPI operation.
 *
 * Single source of truth shared by the MCP tool derivation (mcp/tools.ts) and
 * the OpenAPI document generation (api/schema.ts), which stamps eligible
 * operations with `x-gitbook-mcp`. Eligibility is *computed* from the
 * operation's declared `security` — never marked by hand — so the OpenAPI
 * document, the docs and the MCP tool surface can't get out of sync.
 *
 * This module is dependency-free on purpose: both sides import it without
 * creating an import cycle.
 */

/**
 * Optional `x-mcp` extension on an OpenAPI operation controlling how it is
 * projected as an MCP tool.
 */
export type XMcpExtension = {
  /** Set to `false` to exclude the operation from the MCP tool surface. */
  enabled?: boolean;
  /** Override the tool name (defaults to the operationId). */
  name?: string;
  /** Override the tool description (defaults to summary + description). */
  description?: string;
  /**
   * Override the tool's `destructiveHint`. It defaults to the method: `PUT`,
   * `PATCH` and `DELETE` are destructive, `POST` is not. Set it on a `POST`
   * that changes or removes something that exists, revokes access, or sends
   * something that cannot be recalled: the Claude and ChatGPT directories
   * review every tool's annotations against what it does.
   */
  destructive?: boolean;
};

type EligibilityFields = {
  security?: readonly Record<string, unknown>[];
  "x-internal"?: boolean;
  "x-mcp"?: XMcpExtension;
};

/**
 * An operation is exposed on the MCP server when a user-held token can call
 * it: its security declares the `personalAccessToken` or `oauth2` scheme.
 * Project-token-only operations (CI/SDK endpoints), public endpoints and
 * internal operations are excluded, as are explicit `x-mcp: { enabled: false }`
 * opt-outs.
 */
export function isMcpEligible(operation: EligibilityFields): boolean {
  if (operation["x-internal"]) {
    return false;
  }
  if (operation["x-mcp"]?.enabled === false) {
    return false;
  }
  const security = operation.security;
  if (!security || security.length === 0) {
    return false;
  }
  return security.some(
    (requirement) =>
      "personalAccessToken" in requirement || "oauth2" in requirement,
  );
}
