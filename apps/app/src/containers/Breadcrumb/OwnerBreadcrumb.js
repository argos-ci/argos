import React from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import {
  BreadcrumbItem,
  BreadcrumbItemMenu,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@argos-ci/app/src/components";
import { useQuery } from "../Apollo";
import { OwnerAvatar } from "../OwnerAvatar";
import { useUser } from "../User";
import { useOwner, OwnerContextFragment } from "../OwnerContext";
import { OwnerBreadcrumbMenu } from "./OwnerBreadcrumbMenu";

const OWNER_QUERY = gql`
  query Owner($login: String!) {
    owner(login: $login) {
      ...OwnerContextFragment
    }
  }

  ${OwnerContextFragment}
`;

export function OwnerBreadcrumbItem() {
  const { ownerLogin } = useParams();
  const user = useUser();
  const { setOwner } = useOwner();
  const { loading, data = {} } = useQuery(OWNER_QUERY, {
    variables: { login: ownerLogin },
    fetchPolicy: "no-cache",
    skip: !user || !ownerLogin,
  });

  const { owner } = data;

  React.useEffect(() => {
    if (!loading && !!owner) {
      setOwner(owner);
    }
  }, [owner, loading, setOwner]);

  if (!owner) return null;

  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink to={`/${ownerLogin}`}>
          <OwnerAvatar owner={owner} size="sm" />
          {owner.login}
        </BreadcrumbLink>
        <BreadcrumbItemMenu>
          <OwnerBreadcrumbMenu />
        </BreadcrumbItemMenu>
      </BreadcrumbItem>
    </>
  );
}
