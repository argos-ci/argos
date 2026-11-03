import type { ComponentProps, ReactNode } from "react";
import { skipToken, useQuery } from "@apollo/client/react";
import { PlusCircleIcon, ShieldUserIcon } from "lucide-react";
import { matchPath, useLocation } from "react-router";
import { useDebounce } from "use-debounce";

import type { AuthAccount } from "@/containers/Auth";
import { graphql } from "@/gql";
import { getAccountURL } from "@/pages/Account/AccountParams";
import {
  Menu,
  MenuAutoComplete,
  MenuHeading,
  MenuItem,
  MenuSection,
  useMenuQuery,
} from "@/ui/menu-kit";
import { Tooltip } from "@/ui/Tooltip";

import { AccountItem, type AccountItemProps } from "../AccountItem";

const StaffTeamsQuery = graphql(`
  query AccountBreadcrumbMenu_staffTeams($search: String!) {
    staffTeams(first: 8, search: $search) {
      edges {
        id
        ...AccountItem_Account
      }
    }
  }
`);

type Account = AccountItemProps["account"];

function resolveAccountPath(slug: string, pathname: string) {
  if (matchPath("/:slug/settings/*", pathname)) {
    const parts = pathname.split("/");
    return "/" + [slug, ...parts.slice(2)].join("/");
  }
  return getAccountURL({ accountSlug: slug });
}

/** The rows for a list of accounts, handed straight to the menu. */
function getAccountMenuItems(
  accounts: Account[],
  pathname: string,
  options?: { suffix?: ReactNode },
) {
  return accounts.map((account) => {
    return (
      <MenuItem
        key={account.id}
        // The row renders a component, which contributes nothing to the
        // query — without these, typing an account's name finds nothing.
        textValue={account.name || account.slug}
        keywords={account.name ? [account.slug] : []}
        href={resolveAccountPath(account.slug, pathname)}
        suffix={options?.suffix}
      >
        <AccountItem account={account} />
      </MenuItem>
    );
  });
}

function getAccountMenuSections(account: AuthAccount, pathname: string) {
  return (
    <>
      <MenuSection>
        <MenuHeading>Personal</MenuHeading>
        {getAccountMenuItems([account], pathname)}
      </MenuSection>
      <MenuSection>
        <MenuHeading>Teams</MenuHeading>
        {getAccountMenuItems(account.teams, pathname)}
        <MenuItem icon={<PlusCircleIcon />} href="/teams/new">
          Create a Team
        </MenuItem>
      </MenuSection>
    </>
  );
}

const staffAccessSuffix = (
  <Tooltip content="You are not a member of this team">
    <ShieldUserIcon className="size-4" aria-label="Staff access" />
  </Tooltip>
);

/**
 * The teams a staff member can open without being a member, searched on the
 * server: there are far too many to hand the menu up front. Only for a query,
 * whose filter flattens the list, so they need no heading of their own.
 */
function useStaffTeamSearch(account: AuthAccount, query: string) {
  const search = query.trim();
  const [debouncedSearch] = useDebounce(search, 200);
  const enabled = Boolean(account.staff && search);
  const { data, previousData, loading } = useQuery(
    StaffTeamsQuery,
    enabled && debouncedSearch
      ? { variables: { search: debouncedSearch } }
      : skipToken,
  );
  if (!enabled) {
    return { teams: [], searching: false };
  }
  const memberIds = new Set(account.teams.map((team) => team.id));
  // The last answer stays while the next one loads: the menu filters it by
  // what is typed now, so it never shows a team the query no longer matches.
  const teams = (data ?? previousData)?.staffTeams.edges ?? [];
  return {
    teams: teams.filter((team) => !memberIds.has(team.id)),
    searching: loading || search !== debouncedSearch,
  };
}

/**
 * The viewer's accounts, then for a staff member the other teams matching
 * `query`, with the props the `Menu` holding them needs. For a menu built
 * elsewhere too.
 */
export function useAccountMenu(account: AuthAccount, query: string) {
  const location = useLocation();
  const staffSearch = useStaffTeamSearch(account, query);
  return {
    rows: (
      <>
        {getAccountMenuSections(account, location.pathname)}
        {getAccountMenuItems(staffSearch.teams, location.pathname, {
          suffix: staffAccessSuffix,
        })}
      </>
    ),
    search: account.staff ? "Search all teams" : false,
    noResultsPlaceholder: staffSearch.searching
      ? "Searching all teams…"
      : undefined,
  };
}

function AccountMenu(props: {
  account: AuthAccount;
  anchor?: ComponentProps<typeof Menu>["anchor"];
}) {
  const query = useMenuQuery();
  const accountMenu = useAccountMenu(props.account, query);
  return (
    <Menu
      side="bottom"
      align="start"
      anchor={props.anchor}
      search={accountMenu.search}
      noResultsPlaceholder={accountMenu.noResultsPlaceholder}
    >
      {accountMenu.rows}
    </Menu>
  );
}

/**
 * Renders from the viewer resolved by `Auth` rather than a query of its own: a
 * menu's rows are read when it opens and filtered as you type, so they have to
 * all be there from the start — a row that swaps in when a query lands would
 * never be seen by the filter. The accounts travel with the session for
 * exactly this reason. A staff member's search through every team is the one
 * set of rows fetched here: it only exists once something is typed, so no row
 * already on screen is ever swapped out.
 */
export function AccountBreadcrumbMenu(props: {
  account: AuthAccount;
  anchor?: ComponentProps<typeof Menu>["anchor"];
}) {
  return (
    <MenuAutoComplete>
      <AccountMenu {...props} />
    </MenuAutoComplete>
  );
}
