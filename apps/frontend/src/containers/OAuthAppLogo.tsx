import { clsx } from "clsx";
import { BadgeCheckIcon } from "lucide-react";

import { Chip, type ChipProps } from "@/ui/Chip";

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
 * Official brand logos for verified well-known apps, keyed by `knownAppId`
 * (see the backend `oauth/known-apps.ts` registry). Bundled (not remote-loaded)
 * so they are not subject to the app CSP and monochrome marks adapt to the
 * theme via `currentColor`.
 */
const KNOWN_APP_LOGOS: Record<
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

const SIZE_CLASSES = {
  sm: "size-8",
  lg: "size-12",
} as const;

const MONOGRAM_TEXT_CLASSES = {
  sm: "text-sm",
  lg: "text-lg",
} as const;

/**
 * Logo for an OAuth application: the official bundled logo for a verified
 * well-known app, or a monogram fallback.
 */
export function OAuthAppLogo(props: {
  name: string;
  knownAppId?: string | null;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const { name, knownAppId, size = "sm" } = props;
  const Logo = knownAppId ? KNOWN_APP_LOGOS[knownAppId] : undefined;
  if (Logo) {
    return <Logo className={clsx(SIZE_CLASSES[size], "shrink-0")} />;
  }
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      aria-hidden
      className={clsx(
        SIZE_CLASSES[size],
        MONOGRAM_TEXT_CLASSES[size],
        "border-default text-primary-low bg-primary-app flex shrink-0 items-center justify-center rounded-md border font-semibold",
      )}
    >
      {initial}
    </div>
  );
}

/** Badge marking a verified, well-known OAuth application. */
export function VerifiedBadge(props: Pick<ChipProps, "scale">) {
  return (
    <Chip color="success" icon={BadgeCheckIcon} {...props}>
      Verified
    </Chip>
  );
}
