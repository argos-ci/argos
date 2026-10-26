import type { ReactNode } from "react";

import { Button, ButtonIcon, LinkButton } from "@/ui/Button";
import { Tooltip } from "@/ui/Tooltip";
import { getSlackAuthURL } from "@/util/slack";

export const SLACK_OWNER_ONLY_REASON =
  "Only team owners can manage the Slack integration.";

/**
 * Wraps a disabled Slack action to say who can take it.
 */
export function SlackOwnerOnlyTooltip(props: { children: ReactNode }) {
  return (
    <Tooltip content={SLACK_OWNER_ONLY_REASON}>
      <div className="flex">{props.children}</div>
    </Tooltip>
  );
}

/**
 * Starts the Slack install of the account, disabled for anyone but a team
 * owner.
 */
export function SlackInstallButton(props: {
  accountId: string;
  hasAdminPermission: boolean;
  target: "_blank" | "_parent";
  children: ReactNode;
}) {
  const label = (
    <>
      <ButtonIcon>
        <SlackColoredLogo />
      </ButtonIcon>
      {props.children}
    </>
  );
  if (!props.hasAdminPermission) {
    return (
      <SlackOwnerOnlyTooltip>
        <Button variant="google" disabled>
          {label}
        </Button>
      </SlackOwnerOnlyTooltip>
    );
  }
  return (
    <LinkButton
      variant="google"
      target={props.target}
      href={getSlackAuthURL({ accountId: props.accountId })}
    >
      {label}
    </LinkButton>
  );
}

export function SlackColoredLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      aria-label="Slack"
      viewBox="0 0 60 60"
      {...props}
    >
      <path
        fill="#36C5F0"
        d="M22 12a6 6 0 1 1 6-6v6zm0 4a6 6 0 0 1 0 12H6a6 6 0 1 1 0-12"
      />
      <path
        fill="#2EB67D"
        d="M48 22a6 6 0 1 1 6 6h-6zM32 6a6 6 0 1 1 12 0v16a6 6 0 0 1-12 0z"
      />
      <path
        fill="#ECB22E"
        d="M38 48a6 6 0 1 1-6 6v-6zm16-16a6 6 0 0 1 0 12H38a6 6 0 1 1 0-12"
      />
      <path
        fill="#E01E5A"
        d="M12 38a6 6 0 1 1-6-6h6zm4 0a6 6 0 1 1 12 0v16a6 6 0 0 1-12 0z"
      />
    </svg>
  );
}
