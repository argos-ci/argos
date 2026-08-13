/**
 * Works out whether an API request was made by a coding agent, and which one.
 *
 * Agents never call the API directly — they drive the CLI or the MCP server —
 * so each surface carries the identity differently:
 *
 * - **CLI**: an `agent/<name>` token in the `User-Agent`, from the agent
 *   detection the CLI runs at startup.
 * - **MCP**: the OAuth client holding the access token. OAuth exists here to
 *   serve the CLI and MCP clients, and MCP is an agent protocol — so an OAuth
 *   client that isn't the CLI is taken to be an agent even when the curated
 *   known-apps registry doesn't recognize it.
 *
 * A request with neither is a person acting directly (the web app, a script, a
 * personal access token) and resolves to `null`.
 */
import type { Request } from "express";

import type {
  AuthOAuthPayload,
  AuthPATPayload,
  AuthProjectPayload,
} from "@/auth/payload";
import { getKnownApp } from "@/oauth/known-apps";

import {
  isAgentId,
  resolveReportedAgentId,
  UNKNOWN_AGENT_ID,
} from "./registry";

/**
 * The `agent/<name>` product token of a `User-Agent`. The CLI already
 * sanitizes the name into an HTTP token, and this only accepts that shape, so a
 * hand-crafted header can't smuggle anything else through.
 */
const AGENT_TOKEN_REGEX = /(?:^|\s)agent\/([\w.@-]{1,64})(?:\s|$)/i;

/** The agent name a `User-Agent` reports, if it reports one. */
export function parseUserAgentAgentName(
  userAgent: string | undefined,
): string | null {
  const match = userAgent ? AGENT_TOKEN_REGEX.exec(userAgent) : null;
  return match?.[1] ?? null;
}

type RequestAuth =
  | AuthProjectPayload
  | AuthPATPayload
  | AuthOAuthPayload
  | null;

/**
 * Resolve the agent behind a request to a registry id, or `null` when a person
 * made it directly.
 *
 * The `User-Agent` wins over the OAuth client: an agent driving the CLI is more
 * specific than "the CLI", which is the only thing the client id says.
 */
export function resolveRequestAgentId(
  request: Request,
  auth: RequestAuth,
): string | null {
  const reported = parseUserAgentAgentName(request.get("user-agent"));
  if (reported) {
    return resolveReportedAgentId(reported);
  }

  if (auth?.type !== "oauth") {
    return null;
  }

  // A first-party client id we control (`argos-cli`) names the tool, not an
  // agent — an agent driving it identifies itself in the `User-Agent` above.
  const knownApp = getKnownApp(auth.knownAppId);
  if (knownApp && !isAgentId(knownApp.id)) {
    return null;
  }

  return knownApp?.id ?? UNKNOWN_AGENT_ID;
}
