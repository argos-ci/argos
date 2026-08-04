import { ClaudeIcon, CodexIcon, CursorIcon } from "@/containers/agent-icons";

/**
 * Coding agents Argos can hand a prompt to, in the order menus offer them.
 *
 * Each `getURL` is that agent's own deep link: opening it starts the agent
 * installed on the machine with the prompt typed in but not sent, so the prompt
 * never leaves the user's computer. Each caps how much it carries — around
 * 14,000 characters for Claude, 8,000 for Cursor — well above the prompts Argos
 * builds.
 *
 * Claude Code's own `claude-cli://` scheme is deliberately absent. It opens a
 * terminal, and on macOS it does so by having AppleScript *type* its launch
 * command into iTerm2 or Terminal.app — a line the tty cuts at 1,024 bytes,
 * which left roughly 650 characters of prompt and truncated the rest silently.
 * `claude://code/new` opens the same Claude Code session inside the desktop app,
 * where the prompt never goes near a terminal.
 */
export const AI_AGENTS = [
  {
    id: "claude-desktop",
    name: "Claude",
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
