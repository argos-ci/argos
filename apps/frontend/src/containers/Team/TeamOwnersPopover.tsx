import type { ReactNode } from "react";
import { useQuery } from "@apollo/client/react";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { TeamMemberLabel } from "@/containers/UserList";
import { DocumentType, graphql } from "@/gql";
import { AccountPermission, TeamUserLevel } from "@/gql/graphql";
import { Dialog, DialogTrigger } from "@/ui/Dialog";
import { Link, LinkStyleButton } from "@/ui/Link";
import { Loader } from "@/ui/Loader";
import { Popover } from "@/ui/Popover";

/** People listed per role before the popover points to Members for the rest. */
const MAX_LISTED_PER_ROLE = 5;

const _ConnectionFragment = graphql(`
  fragment TeamOwnersPopover_Connection on TeamMemberConnection {
    edges {
      id
      level
      user {
        id
        name
        slug
        avatar {
          ...AccountAvatarFragment
        }
      }
    }
    pageInfo {
      totalCount
    }
  }
`);

const TeamRoleMembersQuery = graphql(`
  query TeamOwnersPopover_members(
    $slug: String!
    $first: Int!
    $withBilling: Boolean!
  ) {
    account(slug: $slug) {
      id
      ... on Team {
        owners: members(levels: [owner], first: $first) {
          ...TeamOwnersPopover_Connection
        }
        billingMembers: members(levels: [billing], first: $first)
          @include(if: $withBilling) {
          ...TeamOwnersPopover_Connection
        }
      }
    }
  }
`);

type Connection = DocumentType<typeof _ConnectionFragment>;

type TeamRolePopoverProps = {
  account: { slug: string; permissions: readonly AccountPermission[] };
  children: ReactNode;
};

/**
 * Words naming the team's owners that open the list of them, so a member who
 * is told to ask one knows whom to ask. Plain text for a viewer outside the
 * team, who cannot read its members.
 */
export function TeamOwnersPopover(props: TeamRolePopoverProps) {
  return <TeamRolePopover {...props} withBilling={false} />;
}

/** The same, listing billing members after the owners: both manage billing. */
export function TeamBillingPopover(props: TeamRolePopoverProps) {
  return <TeamRolePopover {...props} withBilling />;
}

function TeamRolePopover(
  props: TeamRolePopoverProps & { withBilling: boolean },
) {
  const { account, children, withBilling } = props;
  if (!account.permissions.includes(AccountPermission.View)) {
    return children;
  }
  const title = withBilling ? "Owners and billing members" : "Team owners";
  return (
    <DialogTrigger>
      <LinkStyleButton>{children}</LinkStyleButton>
      <Popover className="w-72">
        <Dialog aria-label={title} className="flex flex-col p-1.5">
          <div className="text-low px-2 pt-1.5 pb-1 text-xs font-semibold">
            {title}
          </div>
          <TeamRoleMembers
            accountSlug={account.slug}
            withBilling={withBilling}
          />
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

function TeamRoleMembers(props: { accountSlug: string; withBilling: boolean }) {
  const { accountSlug, withBilling } = props;
  const { data, error } = useQuery(TeamRoleMembersQuery, {
    variables: {
      slug: accountSlug,
      first: MAX_LISTED_PER_ROLE,
      withBilling,
    },
  });
  const membersURL = `/${accountSlug}/settings/members`;
  if (error) {
    return (
      <p className="px-2 py-1.5 text-sm">
        The list did not load. <Link href={membersURL}>See all members</Link>
      </p>
    );
  }
  if (!data) {
    return (
      <div className="flex justify-center py-3">
        <Loader className="size-5" delay={0} />
      </div>
    );
  }
  if (data.account?.__typename !== "Team") {
    return null;
  }
  const { owners, billingMembers } = data.account;
  return (
    <>
      <RoleMembers
        connection={owners}
        seeAll={{
          href: `${membersURL}?role=${TeamUserLevel.Owner}`,
          label: "owners",
        }}
      />
      {billingMembers ? (
        <RoleMembers
          connection={billingMembers}
          seeAll={{
            href: `${membersURL}?role=${TeamUserLevel.Billing}`,
            label: "billing members",
          }}
        />
      ) : null}
    </>
  );
}

function RoleMembers(props: {
  connection: Connection;
  seeAll: { href: string; label: string };
}) {
  const { connection, seeAll } = props;
  const { totalCount } = connection.pageInfo;
  return (
    <>
      <ul className="flex flex-col">
        {connection.edges.map((member) => (
          <li key={member.id} className="flex items-center gap-2.5 px-2 py-1.5">
            <AccountAvatar
              avatar={member.user.avatar}
              className="size-7 shrink-0"
            />
            <div className="min-w-0 flex-1 break-words">
              <div className="text-sm font-semibold">
                {member.user.name || member.user.slug}
              </div>
              <div className="text-low text-xs">{member.user.slug}</div>
            </div>
            <div className="text-low shrink-0 text-xs">
              {TeamMemberLabel[member.level]}
            </div>
          </li>
        ))}
      </ul>
      {totalCount > connection.edges.length ? (
        <div className="border-t-thin mt-1 px-2 pt-2 pb-1 text-sm">
          <Link href={seeAll.href}>
            See all {totalCount} {seeAll.label}
          </Link>
        </div>
      ) : null}
    </>
  );
}
