import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client";
import { PlusCircleIcon } from "lucide-react";
import { MenuSection } from "react-aria-components";
import { matchPath, useLocation } from "react-router-dom";

import { DocumentType, graphql } from "@/gql";
import { getAccountURL } from "@/pages/Account/AccountParams";
import { BreadcrumbMenuButton } from "@/ui/Breadcrumb";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuLoader,
  MenuTitle,
  MenuTrigger,
} from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

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
  return (
    <>
      {accounts.map((account) => {
        return (
          <MenuItem
            key={account.id}
            href={resolveAccountPath(account.slug, location.pathname)}
          >
            <AccountItem account={account} />
          </MenuItem>
        );
      })}
    </>
  );
}

function MenuContent() {
  const { data } = useSuspenseQuery(MeQuery);
  if (!data.me) {
    return null;
  }
  const userAccounts = [data.me];
  const teamAccounts = data.me.teams;
  return (
    <Menu>
      <MenuSection>
        <MenuTitle>Personal</MenuTitle>
        <AccountMenuItems accounts={userAccounts} />
      </MenuSection>
      <MenuSection>
        <MenuTitle>Teams</MenuTitle>
        <AccountMenuItems accounts={teamAccounts} />
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

export function AccountBreadcrumbMenu() {
  return (
    <MenuTrigger>
      <BreadcrumbMenuButton />
      <Popover placement="bottom start">
        <Suspense
          fallback={
            <Menu>
              <MenuSection>
                <MenuTitle>Personal</MenuTitle>
                <MenuLoader />
              </MenuSection>
              <MenuSection>
                <MenuTitle>Teams</MenuTitle>
                <MenuLoader />
                <MenuItem href="/teams/new">
                  <MenuItemIcon>
                    <PlusCircleIcon />
                  </MenuItemIcon>
                  Create a Team
                </MenuItem>
              </MenuSection>
            </Menu>
          }
        >
          <MenuContent />
        </Suspense>
      </Popover>
    </MenuTrigger>
  );
}
