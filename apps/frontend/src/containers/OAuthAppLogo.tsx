import { AgentLogo } from "@argos/agents/react";
import { clsx } from "clsx";
import { BadgeCheckIcon } from "lucide-react";

import { Chip, type ChipProps } from "@/ui/Chip";

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
  return (
    <AgentLogo
      id={knownAppId}
      name={name}
      className={clsx(
        SIZE_CLASSES[size],
        MONOGRAM_TEXT_CLASSES[size],
        "shrink-0",
      )}
    />
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
