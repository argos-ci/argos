import * as React from "react";
import { gql } from "graphql-tag";
import { useMatch, useParams } from "react-router-dom";
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@argos-ci/app/src/components";
import { OwnerAvatar, OwnerAvatarFragment } from "../OwnerAvatar";
import { OwnerBreadcrumbMenu } from "./OwnerBreadcrumbMenu";
import { useQuery } from "../Apollo";
import { useUser } from "../User";

const OWNER_BREADCRUMB_OWNER_QUERY = gql`
  query OWNER_BREADCRUMB_OWNER_QUERY($login: String!) {
    owner(login: $login) {
      id
      login
      ...OwnerAvatarFragment
    }
  }

  ${OwnerAvatarFragment}
`;

const InnerOwnerBreadcrumbItem = ({ ownerLogin }) => {
  const user = useUser();
  const match = useMatch(`/${ownerLogin}`);
  const { data } = useQuery(OWNER_BREADCRUMB_OWNER_QUERY, {
    variables: { login: ownerLogin },
  });

  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink
          to={`/${ownerLogin}`}
          aria-current={match ? "page" : undefined}
        >
          <OwnerAvatar owner={data?.owner ?? null} size="sm" />
          {ownerLogin}
        </BreadcrumbLink>
        {user && <OwnerBreadcrumbMenu />}
      </BreadcrumbItem>
    </>
  );
};

export function OwnerBreadcrumbItem() {
  const { ownerLogin } = useParams();
  if (!ownerLogin) return null;
  return <InnerOwnerBreadcrumbItem ownerLogin={ownerLogin} />;
}
