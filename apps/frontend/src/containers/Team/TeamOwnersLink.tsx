import type { ReactNode } from "react";

import { AccountPermission } from "@/gql/graphql";
import { Link } from "@/ui/Link";

/**
 * Words pointing a member to the team's owners: Members, filtered on owners.
 * Plain text for a viewer outside the team, who cannot open its settings.
 */
export function TeamOwnersLink(props: {
  account: { slug: string; permissions: readonly AccountPermission[] };
  children: ReactNode;
}) {
  const { account, children } = props;
  if (!account.permissions.includes(AccountPermission.View)) {
    return children;
  }
  return (
    <Link href={`/${account.slug}/settings/members?role=owner`}>
      {children}
    </Link>
  );
}
