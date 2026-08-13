/**
 * The one registry of the coding agents — and the one first-party tool — that
 * act on Argos on a user's behalf.
 *
 * They reach us through three doors, and each recognizes them differently:
 *
 * - **OAuth / MCP**: a client registers itself (RFC 7591) and is matched on the
 *   *stable* signals it supplies ({@link AgentDefinition.oauth}). A match earns
 *   the verified badge and the official name and logo.
 * - **CLI**: the agent driving it reports its own name, which the CLI forwards
 *   in the `User-Agent` ({@link AgentDefinition.reportedNames}).
 * - **Prompt deep links**: Argos hands a prompt back the other way, opening the
 *   agent on the user's machine ({@link AgentDefinition.getPromptUrl}).
 *
 * All three used to keep their own list of the same handful of products, with
 * their own ids, names and icons. One entry per product is what keeps the
 * comment badge, the OAuth consent screen and the "open in…" menu from drifting
 * apart — and lets a single logo map serve all of them (`../react`).
 *
 * **Ids are stable and persisted** — in `comments.agent` and in
 * `oauth_clients.knownAppId` — so they may be added to but never renamed. Names
 * and logos are display, and can change freely.
 *
 * Nothing here is a trust decision beyond OAuth verification. A CLI-reported
 * name is whatever the caller put in `AI_AGENT`; it only decides which label and
 * mark we show.
 */

export type AgentDefinition = {
  /** Stable id. Also the key of the logo maps in `../react`. */
  id: string;
  /** Official name, as the consent screen and the comment badge say it. */
  name: string;
  homepage: string;
  /**
   * Whether this product acts *as* an agent. False for the Argos CLI: it is a
   * tool a person drives, and an agent driving it reports itself separately —
   * so the CLI's own OAuth client must never be read as "an agent did this".
   */
  isAgent: boolean;
  /**
   * Names this product reports for itself in the CLI's `agent/` token, on top of
   * its id. Mostly the slugs `@vercel/detect-agent` returns, which are shorter
   * than our ids.
   *
   * These are matched **before** ids, which is what lets `claude` mean Claude
   * Code here: the CLI only ever runs under Claude *Code*, while `claude` as an
   * id is the desktop/web app, which reaches us over MCP instead.
   */
  reportedNames?: string[];
  /**
   * Stable signals identifying this product as an OAuth client. With Dynamic
   * Client Registration a client can self-assert any `client_name`, so a name
   * alone can never be trusted; these are the values it cannot pick freely.
   *
   * Deliberately best-effort: until signed software statements (RFC 7591
   * `software_statement`) are widespread, host and id heuristics are the
   * pragmatic option. Seeded from publicly-known values, to be tightened as we
   * observe real registrations. Adding or adjusting one is a code change —
   * appropriate, since verification is a trust decision.
   *
   * An entry without this can never be verified, which is right for the agents
   * that only ever reach us through the CLI.
   */
  oauth?: {
    /** Exact first-party `client_id`s (seeded clients we control). */
    clientIds?: string[];
    /** RFC 7591 `software_id` values. */
    softwareIds?: string[];
    /** Hosts allowed in `client_uri`. */
    clientUriHosts?: string[];
    /** Hosts allowed in a registered `redirect_uri`. */
    redirectHosts?: string[];
  };
  /**
   * Deep link that opens this agent with a prompt typed in but **not sent**, so
   * the prompt never leaves the user's machine. Each scheme caps how much it
   * carries — around 14,000 characters for Claude, 8,000 for Cursor — well above
   * the prompts Argos builds.
   */
  getPromptUrl?: (prompt: string) => string;
};

/**
 * Order matters: {@link resolveOAuthAgent} returns the first entry whose signals
 * match, so a product that shares a redirect host with another has to come after
 * the one that owns it.
 */
const AGENTS: AgentDefinition[] = [
  {
    id: "argos-cli",
    name: "Argos CLI",
    homepage:
      "https://argos-ci.com/docs/reference/argos-command-line-interface-cli",
    isAgent: false,
    oauth: { clientIds: ["argos-cli"] },
  },
  {
    id: "claude",
    name: "Claude",
    homepage: "https://claude.ai",
    isAgent: true,
    oauth: {
      clientUriHosts: ["claude.ai", "claude.com", "anthropic.com"],
      redirectHosts: ["claude.ai", "claude.com"],
    },
    // https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link
    //
    // Claude Code's own `claude-cli://` scheme is deliberately absent. It opens
    // a terminal, and on macOS it does so by having AppleScript *type* its
    // launch command into iTerm2 or Terminal.app — a line the tty cuts at 1,024
    // bytes, which left roughly 650 characters of prompt and truncated the rest
    // silently. `claude://code/new` opens the same Claude Code session inside
    // the desktop app, where the prompt never goes near a terminal.
    getPromptUrl: (prompt) =>
      `claude://code/new?q=${encodeURIComponent(prompt)}`,
  },
  {
    id: "claude-code",
    name: "Claude Code",
    homepage: "https://claude.com/claude-code",
    isAgent: true,
    reportedNames: ["claude", "claudecode", "cowork"],
    oauth: {
      softwareIds: ["claude-code"],
      redirectHosts: ["claude.ai", "claude.com"],
    },
  },
  {
    id: "openai-codex",
    name: "Codex",
    homepage: "https://openai.com/codex",
    isAgent: true,
    reportedNames: ["codex"],
    oauth: {
      clientUriHosts: ["openai.com", "chatgpt.com"],
      redirectHosts: ["openai.com", "chatgpt.com"],
    },
    getPromptUrl: (prompt) =>
      `codex://new?prompt=${encodeURIComponent(prompt)}`,
  },
  {
    id: "cursor",
    name: "Cursor",
    homepage: "https://cursor.com",
    isAgent: true,
    reportedNames: ["cursor-cli"],
    oauth: {
      clientUriHosts: ["cursor.com", "cursor.sh"],
      redirectHosts: ["cursor.com", "cursor.sh"],
    },
    // https://cursor.com/docs/integrations/deeplinks
    getPromptUrl: (prompt) =>
      `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(prompt)}`,
  },
  {
    id: "vscode",
    name: "Visual Studio Code",
    homepage: "https://code.visualstudio.com",
    isAgent: true,
    oauth: {
      clientUriHosts: ["code.visualstudio.com"],
      redirectHosts: ["vscode.dev", "insiders.vscode.dev"],
    },
  },
  {
    id: "windsurf",
    name: "Windsurf",
    homepage: "https://windsurf.com",
    isAgent: true,
    oauth: { clientUriHosts: ["windsurf.com", "codeium.com"] },
  },
  {
    id: "zed",
    name: "Zed",
    homepage: "https://zed.dev",
    isAgent: true,
    oauth: { clientUriHosts: ["zed.dev"] },
  },
  // Agents that only ever reach Argos through the CLI: no OAuth signals, so
  // they can never be verified, and no deep link to hand a prompt back.
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    homepage: "https://google-gemini.github.io/gemini-cli",
    isAgent: true,
    reportedNames: ["gemini"],
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    homepage: "https://github.com/features/copilot",
    isAgent: true,
    reportedNames: ["copilot", "github-copilot-cli"],
  },
  {
    id: "devin",
    name: "Devin",
    homepage: "https://devin.ai",
    isAgent: true,
  },
  {
    id: "replit",
    name: "Replit",
    homepage: "https://replit.com",
    isAgent: true,
  },
  {
    id: "antigravity",
    name: "Antigravity",
    homepage: "https://antigravity.google",
    isAgent: true,
  },
  {
    id: "augment-cli",
    name: "Augment CLI",
    homepage: "https://augmentcode.com",
    isAgent: true,
  },
  {
    id: "opencode",
    name: "OpenCode",
    homepage: "https://opencode.ai",
    isAgent: true,
  },
  {
    id: "v0",
    name: "v0",
    homepage: "https://v0.app",
    isAgent: true,
  },
];

/**
 * Id recorded for an agent we could not put a name to — an unrecognized MCP
 * client, or a CLI run under a custom `AI_AGENT`. The action is still known to
 * be agent-made, which is what a bot marker conveys; only the brand is missing.
 *
 * Self-asserted names are deliberately *not* recorded under their own id: they
 * would render as a name nobody vetted, next to a real person's avatar.
 */
export const UNKNOWN_AGENT_ID = "unknown";

const AGENT_BY_ID = new Map(AGENTS.map((agent) => [agent.id, agent]));

const AGENT_BY_REPORTED_NAME = new Map(
  AGENTS.flatMap(
    (agent) =>
      agent.reportedNames?.map(
        (name) => [name, agent] as [string, AgentDefinition],
      ) ?? [],
  ),
);

/** The registry entry for an id, or `null` for an id we don't know. */
export function getAgent(
  id: string | null | undefined,
): AgentDefinition | null {
  if (!id) {
    return null;
  }
  return AGENT_BY_ID.get(id) ?? null;
}

/** Display name of an id, `null` for an id outside the registry. */
export function getAgentName(id: string | null | undefined): string | null {
  return getAgent(id)?.name ?? null;
}

/**
 * Whether an id names something that acts as an agent — which tells the agents
 * apart from the first-party CLI, the one entry that is a tool, not an agent.
 */
export function isAgentId(id: string | null | undefined): boolean {
  return getAgent(id)?.isAgent === true;
}

/**
 * Strip the version an agent may append to the name it reports, leaving the
 * product.
 *
 * Two shapes occur in the wild: the `@` separator the `AI_AGENT` convention
 * documents (`devin@1`, `custom-agent@2.0`), and the `_` one Claude Code
 * actually emits (`claude-code_2-1-227_agent`). A hyphen is *not* a separator —
 * it is what the convention uses inside a name, as in `cursor-cli`.
 */
function stripAgentVersion(name: string): string {
  return name.split("@")[0]!.split("_")[0]!;
}

/**
 * Resolve the name an agent reported for itself (the CLI's `agent/` token) to a
 * registry id, falling back to {@link UNKNOWN_AGENT_ID}.
 *
 * Reported names win over ids — see {@link AgentDefinition.reportedNames}.
 */
export function resolveReportedAgentId(name: string): string {
  const normalized = stripAgentVersion(name.trim().toLowerCase());
  const agent =
    AGENT_BY_REPORTED_NAME.get(normalized) ?? AGENT_BY_ID.get(normalized);
  return agent?.isAgent ? agent.id : UNKNOWN_AGENT_ID;
}

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
 * Resolve an OAuth client's registration metadata to a registry entry, or `null`
 * if unrecognized. A single positive signal is enough to match.
 */
export function resolveOAuthAgent(metadata: {
  clientId?: string | null;
  softwareId?: string | null;
  clientUri?: string | null;
  redirectUris?: string[] | null;
}): AgentDefinition | null {
  const clientUriHost = getHost(metadata.clientUri);
  const redirectHosts = (metadata.redirectUris ?? [])
    .map((uri) => getHost(uri))
    .filter((host): host is string => host !== null);

  for (const agent of AGENTS) {
    const { oauth } = agent;
    if (!oauth) {
      continue;
    }
    if (metadata.clientId && oauth.clientIds?.includes(metadata.clientId)) {
      return agent;
    }
    if (
      metadata.softwareId &&
      oauth.softwareIds?.includes(metadata.softwareId)
    ) {
      return agent;
    }
    if (clientUriHost && oauth.clientUriHosts?.includes(clientUriHost)) {
      return agent;
    }
    if (
      oauth.redirectHosts &&
      redirectHosts.some((host) => oauth.redirectHosts?.includes(host))
    ) {
      return agent;
    }
  }
  return null;
}

/**
 * The agents the "open in…" menus offer, in the order they list them. Explicit
 * rather than derived from the registry order, which answers to OAuth matching.
 */
const PROMPT_AGENT_IDS = ["claude", "openai-codex", "cursor"] as const;

/** An agent Argos can hand a prompt to. */
export type PromptAgentId = (typeof PROMPT_AGENT_IDS)[number];

export type PromptAgent = AgentDefinition & {
  id: PromptAgentId;
  getPromptUrl: (prompt: string) => string;
};

export const PROMPT_AGENTS: PromptAgent[] = PROMPT_AGENT_IDS.map((id) => {
  const agent = AGENT_BY_ID.get(id);
  if (!agent?.getPromptUrl) {
    throw new Error(`Prompt agent "${id}" has no deep link`);
  }
  return { ...agent, id, getPromptUrl: agent.getPromptUrl };
});

/** Whether an id is one of the agents a prompt can be handed to. */
export function isPromptAgentId(id: string): id is PromptAgentId {
  return PROMPT_AGENTS.some((agent) => agent.id === id);
}
