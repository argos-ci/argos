import { RepoIcon } from "@primer/octicons-react";
import { useParams } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/ui/Breadcrumb";

import { RepositoryBreadcrumbMenu } from "./RepositoryBreadcrumbMenu";

export const RepositoryBreadcrumbItem = () => {
  const { ownerLogin, repositoryName } = useParams();
  const loggedIn = useIsLoggedIn();

  if (!repositoryName) return null;

  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink
          to={`${ownerLogin}/${repositoryName}/builds`}
          aria-current="page"
        >
          <BreadcrumbItemIcon>
            <RepoIcon size={18} />
          </BreadcrumbItemIcon>
          {repositoryName}
        </BreadcrumbLink>
        {loggedIn && <RepositoryBreadcrumbMenu />}
      </BreadcrumbItem>
    </>
  );
};
