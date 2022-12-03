import { useQuery } from "@apollo/client";
import { HomeIcon, OrganizationIcon } from "@primer/octicons-react";
import { useMatch, useParams } from "react-router-dom";

import { useUser } from "@/containers/User";
import { graphql } from "@/gql";
import { OwnerAvatar } from "@/modern/containers/OwnerAvatar";
import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLink,
} from "@/modern/ui/Breadcrumb";

import { OwnerBreadcrumbMenu } from "./OwnerBreadcrumbMenu";

const OwnerQuery = graphql(`
  query OwnerBreadcrumb_owner($login: String!) {
    owner(login: $login) {
      id
      login
      name
    }
  }
`);

const OwnerBreadcrumbLink = ({ ownerLogin }: { ownerLogin: string }) => {
  const match = useMatch(`/${ownerLogin}`);
  const { data, error } = useQuery(OwnerQuery, {
    variables: { login: ownerLogin },
  });
  if (error) {
    throw error;
  }
  return (
    <BreadcrumbLink
      to={`/${ownerLogin}`}
      aria-current={match ? "page" : undefined}
    >
      <BreadcrumbItemIcon>
        {data ? (
          data.owner ? (
            <OwnerAvatar owner={data.owner} size={24} />
          ) : (
            <OrganizationIcon size={18} />
          )
        ) : null}
      </BreadcrumbItemIcon>
      {ownerLogin}
    </BreadcrumbLink>
  );
};

const HomeBreadcrumbLink = () => {
  return (
    <BreadcrumbLink to="/" aria-current="page">
      <HomeIcon size={18} />
      All my repositories
    </BreadcrumbLink>
  );
};

export const OwnerBreadcrumbItem = () => {
  const { ownerLogin } = useParams();
  const user = useUser();

  return (
    <>
      <BreadcrumbItem>
        {ownerLogin ? (
          <OwnerBreadcrumbLink ownerLogin={ownerLogin} />
        ) : (
          <HomeBreadcrumbLink />
        )}
        {user && <OwnerBreadcrumbMenu />}
      </BreadcrumbItem>
    </>
  );
};
