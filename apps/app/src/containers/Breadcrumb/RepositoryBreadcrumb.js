import { RepoIcon } from "@primer/octicons-react";
import { useParams } from "react-router-dom";

import {
  BreadcrumbItem,
  BreadcrumbItemMenu,
  BreadcrumbLink,
  BreadcrumbSeparator,
  Icon,
} from "@argos-ci/app/src/components";

import { useUser } from "../User";
import { RepositoryBreadcrumbMenu } from "./RepositoryBreadcrumbMenu";

export function RepositoryBreadcrumbItem() {
  const user = useUser();
  const { ownerLogin, repositoryName } = useParams();

  if (!repositoryName) return null;

  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink
          to={`${ownerLogin}/${repositoryName}/builds`}
          aria-current="page"
        >
          <Icon
            as={RepoIcon}
            mt={1}
            width={{ _: 20, md: 25 }}
            height={{ _: 20, md: 25 }}
          />
          {repositoryName}
        </BreadcrumbLink>
        {user && (
          <BreadcrumbItemMenu>
            <RepositoryBreadcrumbMenu />
          </BreadcrumbItemMenu>
        )}
      </BreadcrumbItem>
    </>
  );
}
