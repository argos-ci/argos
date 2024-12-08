import { useSuspenseQuery } from "@apollo/client";
import { OrganizationIcon } from "@primer/octicons-react";
import { useMatch, useParams } from "react-router-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { AccountPlanChip } from "@/containers/AccountPlanChip";
import { useAuthTokenPayload, useIsLoggedIn } from "@/containers/Auth";
import { graphql } from "@/gql";
import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLink,
} from "@/ui/Breadcrumb";

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
  const match = useMatch(`/${accountSlug}`);
  const { data } = useSuspenseQuery(AccountQuery, {
    variables: { slug: accountSlug },
  });
  return (
    <BreadcrumbLink
      href={`/${accountSlug}`}
      aria-current={match ? "page" : undefined}
    >
      <BreadcrumbItemIcon>
        {data.account ? (
          <AccountAvatar avatar={data.account.avatar} size={24} />
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
    <>
      <BreadcrumbItem>
        {accountSlug ? (
          <AccountBreadcrumbLink accountSlug={accountSlug} />
        ) : (
          <HomeBreadcrumbLink />
        )}
        {loggedIn && <AccountBreadcrumbMenu />}
      </BreadcrumbItem>
    </>
  );
}
