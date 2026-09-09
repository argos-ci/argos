import { useSuspenseQuery } from "@apollo/client/react";
import { OrganizationIcon } from "@primer/octicons-react";
import { ShieldUserIcon } from "lucide-react";
import { useMatch, useParams } from "react-router";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { AccountPlanChip } from "@/containers/AccountPlanChip";
import { useAuth } from "@/containers/Auth";
import { graphql } from "@/gql";
import { getAccountURL } from "@/pages/Account/AccountParams";
import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLink,
  BreadcrumbMenuButton,
} from "@/ui/Breadcrumb";
import { LinkButton } from "@/ui/Button";
import { MenuRoot, MenuTrigger } from "@/ui/menu-kit";
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
      {data.account?.name || accountSlug}
      {data.account && <AccountPlanChip account={data.account} />}
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
 * Takes a staff member from the team they are looking at to its row in the
 * staff directory, which is otherwise reached by searching for it by hand.
 *
 * Reads the account from the same query the link above already ran, so the
 * cache answers it. Searching by slug rather than name: a name is free text
 * and may be empty, a slug is neither.
 */
function StaffTeamLink({ accountSlug }: { accountSlug: string }) {
  const { data } = useSuspenseQuery(AccountQuery, {
    variables: { slug: accountSlug },
  });
  if (data.account?.__typename !== "Team") {
    return null;
  }
  const search = new URLSearchParams({ search: data.account.slug }).toString();
  return (
    <Tooltip content="Open in staff directory">
      <LinkButton
        variant="ghost"
        size="small"
        iconOnly
        aria-label="Open in staff directory"
        href={`/staff/teams?${search}`}
      >
        <ShieldUserIcon />
      </LinkButton>
    </Tooltip>
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

export function AccountBreadcrumbItem() {
  const { accountSlug } = useParams();
  const auth = useAuth();
  const isStaffArea = Boolean(useMatch("/staff/*"));
  // Not just authenticated: the menu needs the resolved account, because its
  // rows must all exist the moment it can be opened. The button appears with
  // the answer, a beat after the trail does.
  const me = auth.status === "authenticated" ? auth.account : null;

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
      {accountSlug && me?.staff ? (
        <StaffTeamLink accountSlug={accountSlug} />
      ) : null}
    </BreadcrumbItem>
  );
}
