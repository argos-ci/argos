import React from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import {
  BreadcrumbItem,
  BreadcrumbItemMenu,
  BreadcrumbLink,
  BreadcrumbSeparator,
  Loader,
} from "@argos-ci/app/src/components";
import { useQuery } from "../Apollo";
import { OwnerAvatar, OwnerAvatarFragment } from "../OwnerAvatar";
import { useUser } from "../User";
import { OwnerBreadcrumbMenu } from "./OwnerBreadcrumbMenu";

const OWNER_QUERY = gql`
  query Owner($login: String!) {
    owner(login: $login) {
      id
      ...OwnerAvatarFragment
    }
  }

  ${OwnerAvatarFragment}
`;

export function OwnerBreadcrumbItem() {
  const { ownerLogin } = useParams();
  const user = useUser();
  const { loading, data } = useQuery(OWNER_QUERY, {
    variables: { login: ownerLogin },
    fetchPolicy: "no-cache",
    skip: !user || !ownerLogin,
  });

  if (loading) return <Loader />;
  if (!data?.owner) return null;

  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink to={`/${ownerLogin}`}>
          <OwnerAvatar owner={data.owner} size="sm" />
          {data.owner.login}
        </BreadcrumbLink>
        <BreadcrumbItemMenu>
          <OwnerBreadcrumbMenu />
        </BreadcrumbItemMenu>
      </BreadcrumbItem>
    </>
  );
}
