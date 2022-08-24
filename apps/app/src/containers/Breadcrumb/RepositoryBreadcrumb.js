import React from "react";
import { useParams } from "react-router-dom";
import { RepoIcon } from "@primer/octicons-react";
import {
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbItemMenu,
  BreadcrumbLink,
  Icon,
} from "@argos-ci/app/src/components";
import { RepositoryBreadcrumbMenu } from "./RepositoryBreadcrumbMenu";

export function RepositoryBreadcrumbItem() {
  const { ownerLogin, repositoryName } = useParams();

  if (!repositoryName) return null;

  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink to={`${ownerLogin}/${repositoryName}/builds`}>
          <Icon
            as={RepoIcon}
            mt={1}
            width={{ _: 20, md: 25 }}
            height={{ _: 20, md: 25 }}
          />
          {repositoryName}
        </BreadcrumbLink>
        <BreadcrumbItemMenu>
          <RepositoryBreadcrumbMenu />
        </BreadcrumbItemMenu>
      </BreadcrumbItem>
    </>
  );
}
