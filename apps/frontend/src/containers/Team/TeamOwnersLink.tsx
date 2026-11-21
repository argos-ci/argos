import type { MouseEventHandler, ReactNode } from "react";

import { AccountPermission, TeamUserLevel } from "@/gql/graphql";
import { Link } from "@/ui/Link";

type TeamRoleLinkProps = {
  account: { slug: string; permissions: readonly AccountPermission[] };
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

/**
 * Words pointing a member to the people holding a role: Members, filtered on
 * that role. Plain text for a viewer outside the team, who cannot open its
 * settings.
 */
function TeamRoleLink(props: TeamRoleLinkProps & { role: TeamUserLevel }) {
  const { account, children, onClick, role } = props;
  if (!account.permissions.includes(AccountPermission.View)) {
    return children;
  }
  return (
    <Link
      href={`/${account.slug}/settings/members?role=${role}`}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export function TeamOwnersLink(props: TeamRoleLinkProps) {
  return <TeamRoleLink {...props} role={TeamUserLevel.Owner} />;
}

export function TeamBillingMembersLink(props: TeamRoleLinkProps) {
  return <TeamRoleLink {...props} role={TeamUserLevel.Billing} />;
}
