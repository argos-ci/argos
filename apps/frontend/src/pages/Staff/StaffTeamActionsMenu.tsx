import {
  checkHasSubscriptionStatus,
  checkIsTrialingSubscriptionStatus,
} from "@argos/schemas/subscription-status";
import {
  ExternalLinkIcon,
  HourglassIcon,
  MailIcon,
  MoreVerticalIcon,
} from "lucide-react";

import { Button } from "@/ui/Button";
import {
  Menu,
  MenuItem,
  MenuItemTooltip,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "@/ui/menu-kit";

import { getAccountURL } from "../Account/AccountParams";
import type { StaffTrialMode } from "./StaffTrialDialog";
import { useCopyOwnerEmails } from "./useCopyOwnerEmails";

/** What staff can do with a team, from its row in the directory or its page. */
export function StaffTeamActionsMenu(props: {
  team: {
    slug: string;
    name?: string | null;
    subscriptionStatus?: string | null;
  };
  owners: readonly { email: string | null }[];
  onTrial: (mode: StaffTrialMode) => void;
  triggerVariant: "ghost" | "secondary";
}) {
  const { team, owners, onTrial, triggerVariant } = props;
  const isTrialing = checkIsTrialingSubscriptionStatus(team.subscriptionStatus);
  // The rule the start mutation enforces: a trial over a live subscription
  // would leave the team with two in Stripe.
  const hasSubscription = checkHasSubscriptionStatus(team.subscriptionStatus);
  const copyOwnerEmails = useCopyOwnerEmails(owners);
  const label = `${team.name || team.slug} actions`;

  return (
    <MenuRoot>
      <MenuTrigger>
        <Button
          variant={triggerVariant}
          size={triggerVariant === "ghost" ? "small" : undefined}
          iconOnly
          aria-label={label}
        >
          <MoreVerticalIcon />
        </Button>
      </MenuTrigger>
      <Menu aria-label={label}>
        <MenuItem
          icon={<MailIcon />}
          disabled={!copyOwnerEmails}
          suffix={
            copyOwnerEmails ? null : (
              <MenuItemTooltip content="No owner has an email on file" />
            )
          }
          onAction={copyOwnerEmails ?? undefined}
        >
          Copy owner emails
        </MenuItem>
        <MenuItem
          icon={<ExternalLinkIcon />}
          href={getAccountURL({ accountSlug: team.slug })}
        >
          Open team in Argos
        </MenuItem>
        <MenuSeparator />
        {isTrialing ? (
          <MenuItem icon={<HourglassIcon />} onAction={() => onTrial("extend")}>
            Extend trial…
          </MenuItem>
        ) : (
          <MenuItem
            icon={<HourglassIcon />}
            disabled={hasSubscription}
            suffix={
              hasSubscription ? (
                <MenuItemTooltip content="The team already has a subscription" />
              ) : null
            }
            onAction={() => onTrial("start")}
          >
            Start trial…
          </MenuItem>
        )}
      </Menu>
    </MenuRoot>
  );
}
