import type { ComponentProps } from "react";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { BrandShield } from "@/ui/BrandShield";
import { HeadlessLink, Link } from "@/ui/Link";
import { Tooltip } from "@/ui/Tooltip";

import { getAccountURL } from "../Account/AccountParams";
import { getStaffTeamURL } from "./StaffParams";
import { StripeCustomerLink } from "./stripe";

/**
 * A team in a staff table. The name opens the team's staff page, so a click on
 * it stays in the staff pages whichever table it is in; leaving them is the job
 * of the logos, one per tool the team can be opened in.
 */
export function StaffTeamCell(props: {
  team: {
    slug: string;
    name?: string | null;
    stripeCustomerId: string | null;
    avatar?: ComponentProps<typeof AccountAvatar>["avatar"];
  };
  /** A line under the name. */
  children?: React.ReactNode;
}) {
  const { team, children } = props;

  return (
    <div className="flex min-w-0 items-center gap-3">
      {team.avatar ? (
        <AccountAvatar avatar={team.avatar} className="size-8 shrink-0" />
      ) : null}
      <div className="min-w-0 flex-1">
        {/* `w-fit`: a block link would be clickable across the blank width
            after a short name. */}
        <Link
          href={getStaffTeamURL(team.slug)}
          className="block w-fit max-w-full truncate font-medium"
        >
          {team.name || team.slug}
        </Link>
        {children}
      </div>
      {/* At the cell edge rather than after the name: there they would read as
          tags on the team, and land at a different offset on every row. Sized
          for both tiles, so a team without a Stripe customer keeps its Argos
          tile in the same column as the others. */}
      <div className="flex w-10 shrink-0 items-center gap-2">
        <ArgosTeamLink teamSlug={team.slug} />
        <StripeCustomerLink stripeCustomerId={team.stripeCustomerId} />
      </div>
    </div>
  );
}

function ArgosTeamLink(props: { teamSlug: string }) {
  return (
    <Tooltip content="Open team in Argos">
      <HeadlessLink
        href={getAccountURL({ accountSlug: props.teamSlug })}
        aria-label="Open team in Argos"
        // A filled square like Stripe's, so the two logos read as one pair. The
        // violet is fixed rather than a theme token, as Stripe's brand color
        // is: the eye's dark pupil would vanish on the dark-mode violets.
        className="flex size-4 items-center justify-center rounded-xs bg-[#ebe4ff] opacity-75 transition hover:opacity-100"
      >
        <BrandShield className="w-3" />
      </HeadlessLink>
    </Tooltip>
  );
}
