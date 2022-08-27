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

const OWNER_QUERY = gql`
  query Owner($login: String!) {
    owner(login: $login) {
      id
      login
      ...OwnerAvatarFragment
    }
  }

  ${OwnerAvatarFragment}
`;

const InnerOwnerBreadcrumbItem = ({ ownerLogin }) => {
  const match = useMatch(`/${ownerLogin}`);
  const { data } = useQuery(OWNER_QUERY, { variables: { login: ownerLogin } });

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
        <OwnerBreadcrumbMenu />
      </BreadcrumbItem>
    </>
  );
};

export function OwnerBreadcrumbItem() {
  const { ownerLogin } = useParams();
  if (!ownerLogin) return null;
  return <InnerOwnerBreadcrumbItem ownerLogin={ownerLogin} />;
}
