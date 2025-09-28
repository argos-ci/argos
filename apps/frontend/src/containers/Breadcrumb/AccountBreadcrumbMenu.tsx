import { useQuery } from "@apollo/client/react";
import { PlusCircleIcon } from "lucide-react";
import { MenuSection } from "react-aria-components";
import { matchPath, useLocation } from "react-router-dom";

import { DocumentType, graphql } from "@/gql";
import { getAccountURL } from "@/pages/Account/AccountParams";
import { Menu, MenuItem, MenuItemIcon, MenuLoader, MenuTitle } from "@/ui/Menu";

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

function AccountMenuItems(props: { accounts: Account[] }) {
  const { accounts } = props;
  const location = useLocation();
  return accounts.map((account) => {
    return (
      <MenuItem
        key={account.id}
        href={resolveAccountPath(account.slug, location.pathname)}
      >
        <AccountItem account={account} />
      </MenuItem>
    );
  });
}

export function AccountBreadcrumbMenu() {
  const { data, error } = useQuery(MeQuery);

  if (error) {
    throw error;
  }

  if (data && !data.me) {
    return null;
  }

  return (
    <Menu>
      <MenuSection>
        <MenuTitle>Personal</MenuTitle>
        {data?.me ? <AccountMenuItems accounts={[data.me]} /> : <MenuLoader />}
      </MenuSection>
      <MenuSection>
        <MenuTitle>Teams</MenuTitle>
        {data?.me ? (
          <AccountMenuItems accounts={data.me.teams} />
        ) : (
          <MenuLoader />
        )}
        <MenuItem href="/teams/new">
          <MenuItemIcon>
            <PlusCircleIcon />
          </MenuItemIcon>
          Create a Team
        </MenuItem>
      </MenuSection>
    </Menu>
  );
}
