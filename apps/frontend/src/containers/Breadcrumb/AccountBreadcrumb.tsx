import { skipToken, useSuspenseQuery } from "@apollo/client/react";
import { OrganizationIcon } from "@primer/octicons-react";
import { clsx } from "clsx";
import {
  BanknoteIcon,
  Building2Icon,
  ChevronDownIcon,
  HourglassIcon,
  ShieldUserIcon,
} from "lucide-react";
import { useMatch, useParams } from "react-router";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { AccountPlanChip } from "@/containers/AccountPlanChip";
import { useAuth, type AuthAccount } from "@/containers/Auth";
import { DocumentType, graphql } from "@/gql";
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

type AccountBreadcrumbAccount = DocumentType<typeof AccountQuery>["account"];

/**
 * What names the account in its crumb. Once a project follows, a phone shows
 * the name alone: the avatar is mostly an initial on a color, which tells one
 * account from another less than its name does, and the room goes to the
 * names.
 */
function AccountCrumbContent(props: {
  account: AccountBreadcrumbAccount;
  accountSlug: string;
  compact: boolean;
}) {
  const { account, accountSlug, compact } = props;
  return (
    <>
      <BreadcrumbItemIcon className={compact ? "max-md:hidden" : undefined}>
        {account ? (
          <AccountAvatar avatar={account.avatar} className="size-6" />
        ) : (
          <OrganizationIcon size={18} />
        )}
      </BreadcrumbItemIcon>
      <BreadcrumbLabel>{account?.name || accountSlug}</BreadcrumbLabel>
      {account && (
        <AccountPlanChip
          account={account}
          phoneAlertsOnly
          className={clsx("shrink-0", compact && "max-md:hidden")}
        />
      )}
    </>
  );
}

/** For a viewer with no account menu to open: signed out, or not yet known. */
function AccountBreadcrumbLink(props: {
  accountSlug: string;
  compact: boolean;
}) {
  const { accountSlug, compact } = props;
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
      <AccountCrumbContent
        account={data.account}
        accountSlug={accountSlug}
        compact={compact}
      />
    </BreadcrumbLink>
  );
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
 * The account crumb opens the account switcher. Staff shortcuts sit in its
 * menu too, the only place a phone has for them.
 */
function AccountSwitcher(props: {
  me: AuthAccount;
  accountSlug: string;
  compact: boolean;
  current: boolean;
}) {
  const { me, accountSlug, compact, current } = props;
  const { data } = useSuspenseQuery(AccountQuery, {
    variables: { slug: accountSlug },
  });
  const team = data.account?.__typename === "Team" ? data.account : null;
  return (
    <MenuRoot>
      <MenuTrigger>
        <BreadcrumbMenuButton current={current}>
          <AccountCrumbContent
            account={data.account}
            accountSlug={accountSlug}
            compact={compact}
          />
        </BreadcrumbMenuButton>
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

/**
 * With a project after it, a phone's account crumb gives up most of the room
 * when both names do not fit, the project being what the page is about, but
 * keeps a few letters of its name.
 */
function getCrumbShrinkClassName(compact: boolean) {
  return compact ? "max-md:min-w-20 max-md:shrink-[3]" : undefined;
}

export function AccountBreadcrumbItem() {
  const { accountSlug, projectName } = useParams();
  const auth = useAuth();
  const isStaffArea = Boolean(useMatch("/staff/*"));
  // Not just authenticated: the menu needs the resolved account, because its
  // rows must all exist the moment it can be opened. The button appears with
  // the answer, a beat after the trail does.
  const me = auth.status === "authenticated" ? auth.account : null;
  const compact = Boolean(projectName);

  if (isStaffArea) {
    return (
      <BreadcrumbItem>
        {me ? (
          <MenuRoot>
            <MenuTrigger>
              <BreadcrumbMenuButton current>
                <BreadcrumbItemIcon>
                  <ShieldUserIcon className="size-5" />
                </BreadcrumbItemIcon>
                Staff
              </BreadcrumbMenuButton>
            </MenuTrigger>
            <AccountBreadcrumbMenu account={me} />
          </MenuRoot>
        ) : (
          <StaffBreadcrumbLink />
        )}
      </BreadcrumbItem>
    );
  }

  if (!me) {
    return (
      <BreadcrumbItem className={getCrumbShrinkClassName(compact)}>
        {accountSlug ? (
          <AccountBreadcrumbLink accountSlug={accountSlug} compact={compact} />
        ) : null}
      </BreadcrumbItem>
    );
  }

  return (
    <BreadcrumbItem className={getCrumbShrinkClassName(compact)}>
      <AccountSwitcher
        me={me}
        accountSlug={accountSlug ?? me.slug}
        compact={compact}
        current={Boolean(accountSlug) && !projectName}
      />
      {me.staff ? (
        // Beside the crumb where there is room: the team's directory row stays
        // one click away.
        <div className="contents max-md:hidden">
          <StaffButtonGroup accountSlug={accountSlug} />
        </div>
      ) : null}
    </BreadcrumbItem>
  );
}
