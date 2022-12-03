import { RepoIcon } from "@primer/octicons-react";
import { useParams } from "react-router-dom";

import { useUser } from "@/containers/User";
import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/modern/ui/Breadcrumb";

import { RepositoryBreadcrumbMenu } from "./RepositoryBreadcrumbMenu";

export const RepositoryBreadcrumbItem = () => {
  const { ownerLogin, repositoryName } = useParams();
  const user = useUser();

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
        {user && <RepositoryBreadcrumbMenu />}
      </BreadcrumbItem>
    </>
  );
};
