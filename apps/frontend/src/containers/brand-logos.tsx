import {
  ArgosCliLogo,
  ClaudeCodeLogo,
  ClaudeLogo,
  CodexLogo,
  CursorLogo,
  VSCodeLogo,
  WindsurfLogo,
  ZedLogo,
} from "./oauth-logos";

/**
 * Official brand logos, keyed by the id the backend uses for a product —
 * `oauth/known-apps.ts` for a verified OAuth app, `agent/registry.ts` for a
 * coding agent. The two registries deliberately share ids where they name the
 * same product, so one map serves both. Bundled (not remote-loaded) so they are
 * not subject to the app CSP and monochrome marks adapt to the theme via
 * `currentColor`.
 *
 * An id with no entry falls back to whatever the caller shows for an unknown
 * product (a monogram, or a generic bot).
 */
export const KNOWN_APP_LOGOS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  "argos-cli": ArgosCliLogo,
  claude: ClaudeLogo,
  "claude-code": ClaudeCodeLogo,
  "openai-codex": CodexLogo,
  cursor: CursorLogo,
  vscode: VSCodeLogo,
  windsurf: WindsurfLogo,
  zed: ZedLogo,
};
