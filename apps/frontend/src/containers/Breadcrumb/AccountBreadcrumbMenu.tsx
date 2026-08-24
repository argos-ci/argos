import {
  BanknoteIcon,
  Building2Icon,
  HourglassIcon,
  PlusCircleIcon,
} from "lucide-react";
import { matchPath, useLocation } from "react-router";

import type { AuthAccount } from "@/containers/Auth";
import { getAccountURL } from "@/pages/Account/AccountParams";
import { Menu, MenuHeading, MenuItem, MenuSection } from "@/ui/menu-kit";

import { AccountItem, type AccountItemProps } from "../AccountItem";

type Account = AccountItemProps["account"];

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
        // The row renders a component, which contributes nothing to the
        // query — without these, typing an account's name finds nothing.
        textValue={account.name || account.slug}
        keywords={account.name ? [account.slug] : []}
        href={resolveAccountPath(account.slug, pathname)}
      >
        <AccountItem account={account} />
      </MenuItem>
    );
  });
}

/**
 * Renders from the viewer resolved by `Auth` rather than a query of its own: a
 * menu's rows are read when it opens and filtered as you type, so they have to
 * all be there from the start — a row that swaps in when a query lands would
 * never be seen by the filter. The accounts travel with the session for
 * exactly this reason.
 */
export function AccountBreadcrumbMenu(props: { account: AuthAccount }) {
  const { account } = props;
  const location = useLocation();

  return (
    <Menu side="bottom" align="start">
      <MenuSection>
        <MenuHeading>Personal</MenuHeading>
        {getAccountMenuItems([account], location.pathname)}
      </MenuSection>
      <MenuSection>
        <MenuHeading>Teams</MenuHeading>
        {getAccountMenuItems(account.teams, location.pathname)}
        <MenuItem icon={<PlusCircleIcon />} href="/teams/new">
          Create a Team
        </MenuItem>
      </MenuSection>
      {account.staff ? (
        <MenuSection>
          <MenuHeading>Staff</MenuHeading>
          {/* One icon each rather than the same staff badge three times: the
              heading already says these are staff pages, so the icons are free
              to say which page. */}
          <MenuItem icon={<Building2Icon />} href="/staff/teams">
            All teams
          </MenuItem>
          <MenuItem icon={<HourglassIcon />} href="/staff/trials">
            Trials
          </MenuItem>
          <MenuItem icon={<BanknoteIcon />} href="/staff/revenue">
            Revenue
          </MenuItem>
        </MenuSection>
      ) : null}
    </Menu>
  );
}
