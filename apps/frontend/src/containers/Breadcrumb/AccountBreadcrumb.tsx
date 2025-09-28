import { useSuspenseQuery } from "@apollo/client/react";
import { OrganizationIcon } from "@primer/octicons-react";
import { MenuTrigger } from "react-aria-components";
import { useMatch, useParams } from "react-router-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { AccountPlanChip } from "@/containers/AccountPlanChip";
import { useAuthTokenPayload, useIsLoggedIn } from "@/containers/Auth";
import { graphql } from "@/gql";
import { getAccountURL } from "@/pages/Account/AccountParams";
import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLink,
  BreadcrumbMenuButton,
} from "@/ui/Breadcrumb";
import { Popover } from "@/ui/Popover";

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
  const payload = useAuthTokenPayload();
  if (!payload) {
    return null;
  }
  return <AccountBreadcrumbLink accountSlug={payload.account.slug} />;
}

export function AccountBreadcrumbItem() {
  const { accountSlug } = useParams();
  const loggedIn = useIsLoggedIn();

  return (
    <BreadcrumbItem>
      {accountSlug ? (
        <AccountBreadcrumbLink accountSlug={accountSlug} />
      ) : (
        <HomeBreadcrumbLink />
      )}
      {loggedIn && (
        <MenuTrigger>
          <BreadcrumbMenuButton />
          <Popover placement="bottom start">
            <AccountBreadcrumbMenu />
          </Popover>
        </MenuTrigger>
      )}
    </BreadcrumbItem>
  );
}
