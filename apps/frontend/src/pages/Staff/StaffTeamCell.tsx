import type { ComponentProps } from "react";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { Link } from "@/ui/Link";

import { getStaffTeamURL } from "./StaffParams";
import { ArgosTeamLink, StripeCustomerLink } from "./tool-links";

/**
 * A team in a staff table: the name opens the team's staff page, the logos open
 * the team in each outside tool.
 */
export function StaffTeamCell(props: {
  team: {
    slug: string;
    name: string | null;
    stripeCustomerId: string | null;
    avatar?: ComponentProps<typeof AccountAvatar>["avatar"];
  };
  /** A line under the name. */
  children?: React.ReactNode;
}) {
  const { team, children } = props;

  return (
    <div className="flex items-center gap-3">
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
