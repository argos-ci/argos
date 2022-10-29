import { OrganizationIcon } from "@primer/octicons-react";
import { x } from "@xstyled/styled-components";
import { gql } from "graphql-tag";
import { useMatch, useParams } from "react-router-dom";

import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  Icon,
} from "@argos-ci/app/src/components";

import { useQuery } from "../Apollo";
import { OwnerAvatar, OwnerAvatarFragment } from "../OwnerAvatar";
import { useUser } from "../User";
import { OwnerBreadcrumbMenu } from "./OwnerBreadcrumbMenu";

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
  const { data, loading } = useQuery(OWNER_BREADCRUMB_OWNER_QUERY, {
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
          <x.div
            minW={6}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {loading ? null : data?.owner ? (
              <OwnerAvatar owner={data.owner} size="sm" />
            ) : (
              <Icon as={OrganizationIcon} />
            )}
          </x.div>
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
