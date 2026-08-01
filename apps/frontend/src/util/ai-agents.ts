import {
  ClaudeCodeIcon,
  ClaudeIcon,
  CodexIcon,
  CursorIcon,
} from "@/containers/agent-icons";

/**
 * Coding agents Argos can hand a prompt to, in the order menus offer them.
 *
 * Each `getURL` is that agent's own deep link: opening it starts the agent
 * installed on the machine with the prompt typed in but not sent, so the prompt
 * never leaves the user's computer. They all cap the URL length (5,000
 * characters for the Claude Code CLI, 8,000 for Cursor), which is well above the
 * prompts Argos builds.
 *
 * Claude appears twice because the CLI and the desktop app register different
 * schemes, and only the one that is installed answers: `claude-cli://` opens a
 * terminal session, `claude://` opens the same session inside Claude Desktop.
 */
export const AI_AGENTS = [
  {
    id: "claude-code",
    name: "Claude Code",
    Icon: ClaudeCodeIcon,
    // https://code.claude.com/docs/en/deep-links
    getURL: (prompt: string) =>
      `claude-cli://open?q=${encodeURIComponent(prompt)}`,
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    Icon: ClaudeIcon,
    // https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link
    getURL: (prompt: string) =>
      `claude://code/new?q=${encodeURIComponent(prompt)}`,
  },
  {
    id: "codex",
    name: "Codex",
    Icon: CodexIcon,
    getURL: (prompt: string) =>
      `codex://new?prompt=${encodeURIComponent(prompt)}`,
  },
  {
    id: "cursor",
    name: "Cursor",
    Icon: CursorIcon,
    // https://cursor.com/docs/integrations/deeplinks
    getURL: (prompt: string) =>
      `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(prompt)}`,
  },
] as const;

export type AiAgentId = (typeof AI_AGENTS)[number]["id"];
