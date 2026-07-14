/**
 * Curated registry of well-known OAuth clients (agents/tools).
 *
 * With Dynamic Client Registration a client can self-assert any `client_name`,
 * so a name alone can never be trusted. Instead we match a client against this
 * registry using *stable* signals it supplies at registration time
 * (`software_id`, `client_uri` host, redirect host) or a fixed first-party
 * `client_id`. A match confers the "verified" badge and the official (bundled,
 * frontend-side) logo keyed by `id`.
 *
 * This is deliberately best-effort: until signed software statements
 * (RFC 7591 `software_statement`) are widespread, host/name heuristics are the
 * pragmatic option. The match rules below are seeded from publicly-known values
 * and should be tightened as we observe real registrations. Adding/adjusting an
 * entry is a code change — appropriate, since verification is a trust decision.
 */

export type KnownApp = {
  /** Stable id; also the key the frontend uses to pick the bundled logo. */
  id: string;
  displayName: string;
  homepage: string;
  match: {
    /** Exact first-party `client_id`s (seeded clients we control). */
    clientIds?: string[];
    /** RFC 7591 `software_id` values. */
    softwareIds?: string[];
    /** Hosts allowed in `client_uri`. */
    clientUriHosts?: string[];
    /** Hosts allowed in a registered `redirect_uri`. */
    redirectHosts?: string[];
  };
};

const KNOWN_APPS: KnownApp[] = [
  {
    id: "argos-cli",
    displayName: "Argos CLI",
    homepage:
      "https://argos-ci.com/docs/reference/argos-command-line-interface-cli",
    match: { clientIds: ["argos-cli"] },
  },
  {
    id: "claude",
    displayName: "Claude",
    homepage: "https://claude.ai",
    match: {
      clientUriHosts: ["claude.ai", "claude.com", "anthropic.com"],
      redirectHosts: ["claude.ai", "claude.com"],
    },
  },
  {
    id: "claude-code",
    displayName: "Claude Code",
    homepage: "https://claude.com/claude-code",
    match: {
      softwareIds: ["claude-code"],
      redirectHosts: ["claude.ai", "claude.com"],
    },
  },
  {
    id: "openai-codex",
    displayName: "OpenAI Codex",
    homepage: "https://openai.com/codex",
    match: {
      clientUriHosts: ["openai.com", "chatgpt.com"],
      redirectHosts: ["openai.com", "chatgpt.com"],
    },
  },
  {
    id: "cursor",
    displayName: "Cursor",
    homepage: "https://cursor.com",
    match: {
      clientUriHosts: ["cursor.com", "cursor.sh"],
      redirectHosts: ["cursor.com", "cursor.sh"],
    },
  },
  {
    id: "vscode",
    displayName: "Visual Studio Code",
    homepage: "https://code.visualstudio.com",
    match: {
      clientUriHosts: ["code.visualstudio.com"],
      redirectHosts: ["vscode.dev", "insiders.vscode.dev"],
    },
  },
  {
    id: "windsurf",
    displayName: "Windsurf",
    homepage: "https://windsurf.com",
    match: { clientUriHosts: ["windsurf.com", "codeium.com"] },
  },
  {
    id: "zed",
    displayName: "Zed",
    homepage: "https://zed.dev",
    match: { clientUriHosts: ["zed.dev"] },
  },
];

function getHost(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Resolve a client's metadata to a known app, or `null` if unrecognized.
 * A single positive signal is enough to match.
 */
export function resolveKnownApp(metadata: {
  clientId?: string | null;
  softwareId?: string | null;
  clientUri?: string | null;
  redirectUris?: string[] | null;
}): KnownApp | null {
  const clientUriHost = getHost(metadata.clientUri);
  const redirectHosts = (metadata.redirectUris ?? [])
    .map((uri) => getHost(uri))
    .filter((host): host is string => host !== null);

  for (const app of KNOWN_APPS) {
    const { match } = app;
    if (metadata.clientId && match.clientIds?.includes(metadata.clientId)) {
      return app;
    }
    if (
      metadata.softwareId &&
      match.softwareIds?.includes(metadata.softwareId)
    ) {
      return app;
    }
    if (clientUriHost && match.clientUriHosts?.includes(clientUriHost)) {
      return app;
    }
    if (
      match.redirectHosts &&
      redirectHosts.some((host) => match.redirectHosts?.includes(host))
    ) {
      return app;
    }
  }
  return null;
}

export function getKnownApp(id: string | null | undefined): KnownApp | null {
  if (!id) {
    return null;
  }
  return KNOWN_APPS.find((app) => app.id === id) ?? null;
}
