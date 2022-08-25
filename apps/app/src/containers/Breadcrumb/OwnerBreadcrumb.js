import * as React from "react";
import { gql } from "graphql-tag";
import { useMatch, useParams } from "react-router-dom";
import {
  BreadcrumbItem,
  BreadcrumbItemMenu,
  BreadcrumbLink,
  BreadcrumbSeparator,
  Loader,
} from "@argos-ci/app/src/components";
import { Query } from "../Apollo";
import { OwnerAvatar, OwnerAvatarFragment } from "../OwnerAvatar";
import { useUser } from "../User";
import { OwnerBreadcrumbMenu } from "./OwnerBreadcrumbMenu";

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

export function OwnerBreadcrumbItem() {
  const { ownerLogin } = useParams();
  const match = useMatch(`/${ownerLogin}`);
  const user = useUser();

  return (
    <Query
      query={OWNER_QUERY}
      variables={{ login: ownerLogin }}
      fallback={<Loader />}
      fetchPolicy="no-cache"
      skip={!user || !ownerLogin}
    >
      {(data) => {
        if (!data?.owner) return null;

        return (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                to={`/${ownerLogin}`}
                aria-current={match ? "page" : "false"}
              >
                <OwnerAvatar owner={data.owner} size="sm" />
                {data.owner.login}
              </BreadcrumbLink>
              <BreadcrumbItemMenu>
                <OwnerBreadcrumbMenu />
              </BreadcrumbItemMenu>
            </BreadcrumbItem>
          </>
        );
      }}
    </Query>
  );
}
