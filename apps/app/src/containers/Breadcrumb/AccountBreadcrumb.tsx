import { useQuery } from "@apollo/client";
import { OrganizationIcon } from "@primer/octicons-react";
import { useMatch, useParams } from "react-router-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
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
    }
  }
`);

const AccountBreadcrumbLink = ({ accountSlug }: { accountSlug: string }) => {
  const match = useMatch(`/${accountSlug}`);
  const { data, error } = useQuery(AccountQuery, {
    variables: { slug: accountSlug },
  });
  if (error) {
    throw error;
  }
  return (
    <BreadcrumbLink
      to={`/${accountSlug}`}
      aria-current={match ? "page" : undefined}
    >
      <BreadcrumbItemIcon>
        {data ? (
          data.account ? (
            <AccountAvatar avatar={data.account.avatar} size={24} />
          ) : (
            <OrganizationIcon size={18} />
          )
        ) : null}
      </BreadcrumbItemIcon>
      {accountSlug}
    </BreadcrumbLink>
  );
};

const HomeBreadcrumbLink = () => {
  const payload = useAuthTokenPayload();
  if (!payload) {
    return null;
  }
  return <AccountBreadcrumbLink accountSlug={payload.account.slug} />;
};

export const AccountBreadcrumbItem = () => {
  const { accountSlug } = useParams();
  const loggedIn = useIsLoggedIn();

  if (!loggedIn) {
    return null;
  }

  return (
    <>
      <BreadcrumbItem>
        {accountSlug ? (
          <AccountBreadcrumbLink accountSlug={accountSlug} />
        ) : (
          <HomeBreadcrumbLink />
        )}
        <AccountBreadcrumbMenu />
      </BreadcrumbItem>
    </>
  );
};
