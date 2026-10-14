import { skipToken, useSuspenseQuery } from "@apollo/client/react";
import { OrganizationIcon } from "@primer/octicons-react";
import {
  BanknoteIcon,
  Building2Icon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  HourglassIcon,
  ShieldUserIcon,
} from "lucide-react";
import { useMatch, useParams } from "react-router";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { AccountPlanChip } from "@/containers/AccountPlanChip";
import { useAuth, type AuthAccount } from "@/containers/Auth";
import { graphql } from "@/gql";
import { getAccountURL } from "@/pages/Account/AccountParams";
import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLabel,
  BreadcrumbLink,
  BreadcrumbMenuButton,
} from "@/ui/Breadcrumb";
import { Button, LinkButton } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import {
  Menu,
  MenuHeading,
  MenuItem,
  MenuRoot,
  MenuSection,
  MenuTrigger,
} from "@/ui/menu-kit";
import { Tooltip } from "@/ui/Tooltip";
import { useMediaQuery } from "@/ui/useMediaQuery";

import { AccountBreadcrumbMenu } from "./AccountBreadcrumbMenu";

const AccountQuery = graphql(`
  query AccountBreadcrumb_account($slug: String!) {
    account(slug: $slug) {
      id
      slug
      name
      avatar {
        ...AccountAvatarFragment
      }
      ...AccountPlanChip_Account
    }
  }
`);

function AccountBreadcrumbLink({ accountSlug }: { accountSlug: string }) {
  const accountURL = getAccountURL({ accountSlug });
  const isRoot = useMatch(accountURL);
  const isAnalytics = useMatch(`${accountURL}/~/analytics`);
  const isSettings = useMatch(`${accountURL}/settings`);
  const isCurrent = isRoot || isAnalytics || isSettings;
  const { data } = useSuspenseQuery(AccountQuery, {
    variables: { slug: accountSlug },
  });
  return (
    <BreadcrumbLink
      href={accountURL}
      aria-current={isCurrent ? "page" : undefined}
    >
      <BreadcrumbItemIcon>
        {data.account ? (
          <AccountAvatar avatar={data.account.avatar} className="size-6" />
        ) : (
          <OrganizationIcon size={18} />
        )}
      </BreadcrumbItemIcon>
      <BreadcrumbLabel>{data.account?.name || accountSlug}</BreadcrumbLabel>
      {data.account && (
        <AccountPlanChip account={data.account} className="shrink-0" />
      )}
    </BreadcrumbLink>
  );
}

function HomeBreadcrumbLink() {
  const auth = useAuth();
  const account = auth.status === "authenticated" ? auth.account : null;
  // Nothing to link to until the account lands; the trail fills in after.
  if (!account) {
    return null;
  }
  return <AccountBreadcrumbLink accountSlug={account.slug} />;
}

/**
 * A team's row in the staff directory, otherwise reached by searching for it by
 * hand. Searching by slug rather than name: a name is free text and may be
 * empty, a slug is neither.
 */
function getStaffDirectoryURL(teamSlug: string) {
  return `/staff/teams?${new URLSearchParams({ search: teamSlug })}`;
}

function getStaffPageMenuItems() {
  return [
    <MenuItem key="teams" icon={<Building2Icon />} href="/staff/teams">
      All teams
    </MenuItem>,
    <MenuItem key="trials" icon={<HourglassIcon />} href="/staff/trials">
      Trials
    </MenuItem>,
    <MenuItem key="revenue" icon={<BanknoteIcon />} href="/staff/revenue">
      Revenue
    </MenuItem>,
  ];
}

/**
 * The way into the staff pages, from anywhere in the app. On a team, the button
 * takes a staff member to its row in the staff directory; the menu holds every
 * staff page.
 *
 * Reads the account from the same query the link beside it already ran, so the
 * cache answers it.
 */
function StaffButtonGroup(props: { accountSlug: string | undefined }) {
  const { accountSlug } = props;
  const { data } = useSuspenseQuery(
    AccountQuery,
    accountSlug ? { variables: { slug: accountSlug } } : skipToken,
  );
  const team = data?.account?.__typename === "Team" ? data.account : null;
  const label = team ? "Open in staff directory" : "Open staff directory";
  const href = team ? getStaffDirectoryURL(team.slug) : "/staff/teams";
  return (
    <ButtonGroup>
      <Tooltip content={label}>
        <LinkButton
          variant="secondary"
          size="small"
          iconOnly
          aria-label={label}
          href={href}
        >
          <ShieldUserIcon />
        </LinkButton>
      </Tooltip>
      <MenuRoot>
        <MenuTrigger>
          <Button
            variant="secondary"
            size="small"
            iconOnly
            aria-label="Staff pages"
          >
            <ChevronDownIcon />
          </Button>
        </MenuTrigger>
        <Menu side="bottom" align="start" aria-label="Staff pages">
          {getStaffPageMenuItems()}
        </Menu>
      </MenuRoot>
    </ButtonGroup>
  );
}

/**
 * The staff area is a destination of the same nature as an account, so it
 * takes the account's place in the breadcrumb — otherwise the trail would name
 * a personal account while you are browsing staff tooling.
 */
function StaffBreadcrumbLink() {
  return (
    <BreadcrumbLink href="/staff" aria-current="page">
      <BreadcrumbItemIcon>
        <ShieldUserIcon className="size-5" />
      </BreadcrumbItemIcon>
      Staff
    </BreadcrumbLink>
  );
}

/**
 * A phone gets one button where the desktop trail has three: the name opens
 * the switcher, and the staff shortcuts move into it. The link it replaces led
 * to the account's projects, which the tabs below reach as well.
 */
function AccountSwitcher(props: { me: AuthAccount; accountSlug: string }) {
  const { me, accountSlug } = props;
  const { data } = useSuspenseQuery(AccountQuery, {
    variables: { slug: accountSlug },
  });
  const team = data.account?.__typename === "Team" ? data.account : null;
  return (
    <MenuRoot>
      <MenuTrigger>
        <button
          type="button"
          className="text-default focus-ring aria-expanded:bg-active flex h-10 min-w-0 cursor-default items-center gap-1.5 rounded-lg px-1.5 font-medium transition"
        >
          <BreadcrumbItemIcon>
            {data.account ? (
              <AccountAvatar avatar={data.account.avatar} className="size-6" />
            ) : (
              <OrganizationIcon size={18} />
            )}
          </BreadcrumbItemIcon>
          <BreadcrumbLabel>{data.account?.name || accountSlug}</BreadcrumbLabel>
          {data.account && (
            <AccountPlanChip
              account={data.account}
              alertsOnly
              className="shrink-0"
            />
          )}
          <ChevronsUpDownIcon className="text-low size-4 shrink-0" />
        </button>
      </MenuTrigger>
      <AccountBreadcrumbMenu account={me}>
        {me.staff ? (
          <MenuSection>
            <MenuHeading>Staff</MenuHeading>
            {team ? (
              <MenuItem
                icon={<ShieldUserIcon />}
                href={getStaffDirectoryURL(team.slug)}
              >
                Open in staff directory
              </MenuItem>
            ) : null}
            {getStaffPageMenuItems()}
          </MenuSection>
        ) : null}
      </AccountBreadcrumbMenu>
    </MenuRoot>
  );
}

export function AccountBreadcrumbItem() {
  const { accountSlug } = useParams();
  const auth = useAuth();
  const isStaffArea = Boolean(useMatch("/staff/*"));
  // Tailwind's `max-md:` query, so the markup switches where the classes do.
  const isPhone = useMediaQuery("(width < 48rem)");
  // Not just authenticated: the menu needs the resolved account, because its
  // rows must all exist the moment it can be opened. The button appears with
  // the answer, a beat after the trail does.
  const me = auth.status === "authenticated" ? auth.account : null;

  if (isPhone && me && !isStaffArea) {
    return (
      <BreadcrumbItem>
        <AccountSwitcher me={me} accountSlug={accountSlug ?? me.slug} />
      </BreadcrumbItem>
    );
  }

  return (
    <BreadcrumbItem>
      {isStaffArea ? (
        <StaffBreadcrumbLink />
      ) : accountSlug ? (
        <AccountBreadcrumbLink accountSlug={accountSlug} />
      ) : (
        <HomeBreadcrumbLink />
      )}
      {me ? (
        <MenuRoot>
          <MenuTrigger>
            <BreadcrumbMenuButton />
          </MenuTrigger>
          <AccountBreadcrumbMenu account={me} />
        </MenuRoot>
      ) : null}
      {/* The staff area has its own tabs for the same pages. */}
      {me?.staff && !isStaffArea ? (
        <StaffButtonGroup accountSlug={accountSlug} />
      ) : null}
    </BreadcrumbItem>
  );
}
