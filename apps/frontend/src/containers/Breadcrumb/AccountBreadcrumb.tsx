import { skipToken, useSuspenseQuery } from "@apollo/client/react";
import { OrganizationIcon } from "@primer/octicons-react";
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
  BreadcrumbSplitButton,
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
 * What names the account in its crumb. A phone shows the name alone, on every
 * page: the avatar is mostly an initial on a color, which tells one account
 * from another less than its name does.
 */
function AccountCrumbContent(props: {
  account: AccountBreadcrumbAccount;
  accountSlug: string;
}) {
  const { account, accountSlug } = props;
  return (
    <>
      <BreadcrumbItemIcon className="max-md:hidden">
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
          className="shrink-0"
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
    <BreadcrumbItem
      className={getCrumbShrinkClassName({
        name: data.account?.name || accountSlug,
        compact,
      })}
    >
      <BreadcrumbLink
        href={accountURL}
        aria-current={isCurrent ? "page" : undefined}
      >
        <AccountCrumbContent account={data.account} accountSlug={accountSlug} />
      </BreadcrumbLink>
    </BreadcrumbItem>
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

/** The staff shortcuts, for the menus a phone reaches them from. */
export function getStaffMenuSection(teamSlug: string | null) {
  return (
    <MenuSection>
      <MenuHeading>Staff</MenuHeading>
      {teamSlug ? (
        <MenuItem
          icon={<ShieldUserIcon />}
          href={getStaffDirectoryURL(teamSlug)}
        >
          Open in staff directory
        </MenuItem>
      ) : null}
      {getStaffPageMenuItems()}
    </MenuSection>
  );
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
 * The account crumb links to the account, and its chevron opens the account
 * switcher; a phone has one button for both. Its menu also holds the staff
 * shortcuts there, the staff button beside the crumb being desktop only.
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
  const content = (
    <AccountCrumbContent account={data.account} accountSlug={accountSlug} />
  );
  const staffSection = me.staff
    ? getStaffMenuSection(team?.slug ?? null)
    : null;
  return (
    <BreadcrumbItem
      className={getCrumbShrinkClassName({
        name: data.account?.name || accountSlug,
        compact,
      })}
    >
      <BreadcrumbSplitButton
        href={getAccountURL({ accountSlug })}
        current={current}
        menuLabel="Switch account"
        renderMenu={(anchor) => (
          <AccountBreadcrumbMenu account={me} anchor={anchor} />
        )}
        className="max-md:hidden"
      >
        {content}
      </BreadcrumbSplitButton>
      <div className="contents md:hidden">
        <MenuRoot>
          <MenuTrigger>
            <BreadcrumbMenuButton current={current}>
              {content}
            </BreadcrumbMenuButton>
          </MenuTrigger>
          <AccountBreadcrumbMenu account={me}>
            {staffSection}
          </AccountBreadcrumbMenu>
        </MenuRoot>
      </div>
    </BreadcrumbItem>
  );
}

/**
 * With a project after it, the account crumb goes on a phone: the project's
 * button names the team and switches it.
 *
 * Elsewhere, a long account name gives up the room first when the names do
 * not fit, the project being what the page is about, down to a few letters;
 * only then does the project's name shrink. A short name never shrinks: a
 * minimum width that keeps a long one recognizable would leave a gap after a
 * short one, and CSS cannot take the smaller of the two.
 */
function getCrumbShrinkClassName(props: { name: string; compact: boolean }) {
  if (!props.compact) {
    return undefined;
  }
  return props.name.length > 12
    ? // The weight is extreme on purpose: a project shrinking by a fraction of
      // a pixel already cuts its name to an ellipsis.
      "min-w-40 shrink-[10000] max-md:hidden"
    : "shrink-0 max-md:hidden";
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
    const content = (
      <>
        <BreadcrumbItemIcon>
          <ShieldUserIcon className="size-5" />
        </BreadcrumbItemIcon>
        Staff
      </>
    );
    return (
      <BreadcrumbItem>
        {me ? (
          <>
            <BreadcrumbSplitButton
              href="/staff"
              current
              menuLabel="Switch account"
              renderMenu={(anchor) => (
                <AccountBreadcrumbMenu account={me} anchor={anchor} />
              )}
              className="max-md:hidden"
            >
              {content}
            </BreadcrumbSplitButton>
            <div className="contents md:hidden">
              <MenuRoot>
                <MenuTrigger>
                  <BreadcrumbMenuButton current>{content}</BreadcrumbMenuButton>
                </MenuTrigger>
                <AccountBreadcrumbMenu account={me} />
              </MenuRoot>
            </div>
          </>
        ) : (
          <StaffBreadcrumbLink />
        )}
      </BreadcrumbItem>
    );
  }

  if (!me) {
    return accountSlug ? (
      <AccountBreadcrumbLink accountSlug={accountSlug} compact={compact} />
    ) : null;
  }

  return (
    <>
      <AccountSwitcher
        me={me}
        accountSlug={accountSlug ?? me.slug}
        compact={compact}
        current={Boolean(accountSlug) && !projectName}
      />
      {me.staff ? (
        // Beside the crumb where there is room, so the team's directory row
        // stays one click away; an item of its own, so the account's minimum
        // width does not depend on it.
        <BreadcrumbItem className="shrink-0 max-md:hidden">
          <StaffButtonGroup accountSlug={accountSlug} />
        </BreadcrumbItem>
      ) : null}
    </>
  );
}
