import { OrganizationIcon } from "@primer/octicons-react";
import { useMatch, useParams } from "react-router-dom";

import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/modern/ui/Breadcrumb";
import { useQuery } from "@apollo/client";
import { OwnerAvatar } from "@/modern/containers/OwnerAvatar";
import { useUser } from "@/containers/User";
import { graphql } from "@/gql";

import { OwnerBreadcrumbMenu } from "./OwnerBreadcrumbMenu";
import { memo } from "react";

const OwnerQuery = graphql(`
  query OwnerBreadcrumb_owner($login: String!) {
    owner(login: $login) {
      id
      login
      name
    }
  }
`);

const ActiveOwnerBreadcrumbItem = (props: { ownerLogin: string }) => {
  const user = useUser();
  const match = useMatch(`/${props.ownerLogin}`);
  const { data, error } = useQuery(OwnerQuery, {
    variables: { login: props.ownerLogin },
  });

  if (error) {
    throw error;
  }

  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink
          to={`/${props.ownerLogin}`}
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
          {props.ownerLogin}
        </BreadcrumbLink>
        {user && <OwnerBreadcrumbMenu />}
      </BreadcrumbItem>
    </>
  );
};

export const OwnerBreadcrumbItem = memo(() => {
  const { ownerLogin } = useParams();
  if (!ownerLogin) return null;
  return <ActiveOwnerBreadcrumbItem ownerLogin={ownerLogin} />;
});
