import { useQuery } from "@apollo/client/react";
import { PlusCircleIcon, ShieldUserIcon } from "lucide-react";
import { matchPath, useLocation } from "react-router";

import { DocumentType, graphql } from "@/gql";
import { getAccountURL } from "@/pages/Account/AccountParams";
import {
  Menu,
  MenuHeading,
  MenuItem,
  MenuLoader,
  MenuSection,
} from "@/ui/menu-kit";

import { AccountItem } from "../AccountItem";

const _AccountFragment = graphql(`
  fragment AccountBreadcrumbMenu_Account on Account {
    id
    slug
    ...AccountItem_Account
  }
`);

const MeQuery = graphql(`
  query AccountBreadcrumbMenu_me {
    me {
      id
      staff
      ...AccountBreadcrumbMenu_Account
      teams {
        id
        ...AccountBreadcrumbMenu_Account
      }
    }
  }
`);

type Account = DocumentType<typeof _AccountFragment>;

function resolveAccountPath(slug: string, pathname: string) {
  if (matchPath("/:slug/settings/*", pathname)) {
    const parts = pathname.split("/");
    return "/" + [slug, ...parts.slice(2)].join("/");
  }
  return getAccountURL({ accountSlug: slug });
}

/** The rows for a list of accounts, handed straight to the menu. */
function getAccountMenuItems(accounts: Account[], pathname: string) {
  return accounts.map((account) => {
    return (
      <MenuItem
        key={account.id}
        href={resolveAccountPath(account.slug, pathname)}
      >
        <AccountItem account={account} />
      </MenuItem>
    );
  });
}

export function AccountBreadcrumbMenu() {
  const { data, error } = useQuery(MeQuery);
  const location = useLocation();

  if (error) {
    throw error;
  }

  if (data && !data.me) {
    return null;
  }

  return (
    <Menu side="bottom" align="start">
      <MenuSection>
        <MenuHeading>Personal</MenuHeading>
        {data?.me ? (
          getAccountMenuItems([data.me], location.pathname)
        ) : (
          <MenuLoader />
        )}
      </MenuSection>
      <MenuSection>
        <MenuHeading>Teams</MenuHeading>
        {data?.me ? (
          getAccountMenuItems(data.me.teams, location.pathname)
        ) : (
          <MenuLoader />
        )}
        <MenuItem icon={<PlusCircleIcon />} href="/teams/new">
          Create a Team
        </MenuItem>
      </MenuSection>
      {data?.me?.staff ? (
        <MenuSection>
          <MenuHeading>Staff</MenuHeading>
          <MenuItem icon={<ShieldUserIcon />} href="/staff/teams">
            All teams
          </MenuItem>
          <MenuItem icon={<ShieldUserIcon />} href="/staff/trials">
            Trials
          </MenuItem>
        </MenuSection>
      ) : null}
    </Menu>
  );
}
