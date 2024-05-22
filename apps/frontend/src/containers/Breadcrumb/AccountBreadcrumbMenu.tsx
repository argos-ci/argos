import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client";
import { PlusCircleIcon } from "lucide-react";
import { Section } from "react-aria-components";
import { matchPath, useLocation } from "react-router-dom";

import { FragmentType, graphql, useFragment } from "@/gql";
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

const AccountFragment = graphql(`
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

type Account = FragmentType<typeof AccountFragment>;

function resolveAccountPath(slug: string, pathname: string) {
  if (matchPath("/:slug/settings/*", pathname)) {
    const parts = pathname.split("/");
    return "/" + [slug, ...parts.slice(2)].join("/");
  }
  return `/${slug}`;
}

function AccountMenuItems(props: { accounts: Account[] }) {
  const accounts = useFragment(AccountFragment, props.accounts);
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
    <>
      <Section>
        <MenuTitle>Personal</MenuTitle>
        <AccountMenuItems accounts={userAccounts} />
      </Section>
      <Section>
        <MenuTitle>Teams</MenuTitle>
        <AccountMenuItems accounts={teamAccounts} />
        <MenuItem href="/teams/new">
          <MenuItemIcon>
            <PlusCircleIcon />
          </MenuItemIcon>
          Create a Team
        </MenuItem>
      </Section>
    </>
  );
}

export function AccountBreadcrumbMenu() {
  return (
    <MenuTrigger>
      <BreadcrumbMenuButton />
      <Popover placement="bottom start">
        <Menu>
          <Suspense
            fallback={
              <>
                <Section>
                  <MenuTitle>Personal</MenuTitle>
                  <MenuLoader />
                </Section>
                <Section>
                  <MenuTitle>Teams</MenuTitle>
                  <MenuLoader />
                  <MenuItem href="/teams/new">
                    <MenuItemIcon>
                      <PlusCircleIcon />
                    </MenuItemIcon>
                    Create a Team
                  </MenuItem>
                </Section>
              </>
            }
          >
            <MenuContent />
          </Suspense>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
