/**
 * Curated registry of the coding agents that act on Argos through the CLI or
 * the MCP server.
 *
 * An agent reaches the API with its user's own credentials, so the identity of
 * the *tool* is self-asserted: the CLI forwards what `@vercel/detect-agent`
 * found (ultimately the `AI_AGENT` environment variable, which anyone can set),
 * and an MCP client picks its own OAuth registration metadata. Nothing here is
 * a trust decision — it only decides which name and logo we show next to a
 * comment. Anything unrecognized still counts as an agent and renders as a
 * generic bot.
 *
 * Ids are shared with `oauth/known-apps.ts` where the same product appears in
 * both, so the frontend keys a single logo map by them.
 */

type AgentDefinition = {
  /** Stable id; also the key the frontend uses to pick the bundled logo. */
  id: string;
  displayName: string;
};

const AGENTS: AgentDefinition[] = [
  { id: "claude-code", displayName: "Claude Code" },
  { id: "claude", displayName: "Claude" },
  { id: "openai-codex", displayName: "OpenAI Codex" },
  { id: "cursor", displayName: "Cursor" },
  { id: "vscode", displayName: "Visual Studio Code" },
  { id: "windsurf", displayName: "Windsurf" },
  { id: "zed", displayName: "Zed" },
  { id: "gemini-cli", displayName: "Gemini CLI" },
  { id: "github-copilot", displayName: "GitHub Copilot" },
  { id: "devin", displayName: "Devin" },
  { id: "replit", displayName: "Replit" },
  { id: "antigravity", displayName: "Antigravity" },
  { id: "augment-cli", displayName: "Augment CLI" },
  { id: "opencode", displayName: "OpenCode" },
  { id: "v0", displayName: "v0" },
];

/**
 * Id stored for an agent we could not put a name to — an unrecognized MCP
 * client, or a CLI run under a custom `AI_AGENT`. The action is still known to
 * be agent-made, which is what the bot marker conveys; only the brand is
 * missing. Self-asserted names are deliberately *not* stored under their own
 * id: they would render as a name nobody vetted.
 */
export const UNKNOWN_AGENT_ID = "unknown";

/**
 * Names the CLI reports that differ from our id.
 *
 * These are the slugs `@vercel/detect-agent` returns, which are shorter than
 * ours and, for `claude`, ambiguous: the CLI only ever runs under Claude *Code*
 * — `claude` as a registry id is the desktop/web app, which reaches us over MCP
 * instead. Keeping this map on the CLI side of the resolution is what lets the
 * same word mean the right product on each side.
 */
const REPORTED_AGENT_ALIASES: Record<string, string> = {
  claude: "claude-code",
  claudecode: "claude-code",
  cowork: "claude-code",
  codex: "openai-codex",
  "cursor-cli": "cursor",
  gemini: "gemini-cli",
  copilot: "github-copilot",
  "github-copilot-cli": "github-copilot",
};

const AGENT_BY_ID = new Map(AGENTS.map((agent) => [agent.id, agent]));

/**
 * Strip the version an agent may append to its name, leaving the product.
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
 */
export function resolveReportedAgentId(name: string): string {
  const normalized = stripAgentVersion(name.trim().toLowerCase());
  const id = REPORTED_AGENT_ALIASES[normalized] ?? normalized;
  return AGENT_BY_ID.has(id) ? id : UNKNOWN_AGENT_ID;
}

/**
 * Whether an id names an agent in this registry — used to tell the well-known
 * OAuth apps that are agents (Claude, Cursor, …) from the ones that are not
 * (the Argos CLI itself).
 */
export function isAgentId(id: string): boolean {
  return AGENT_BY_ID.has(id);
}

/** Display name of an agent id, `null` for an id outside the registry. */
export function getAgentDisplayName(id: string): string | null {
  return AGENT_BY_ID.get(id)?.displayName ?? null;
}
