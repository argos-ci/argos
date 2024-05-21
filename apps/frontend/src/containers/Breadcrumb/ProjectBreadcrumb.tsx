import { RepoIcon } from "@primer/octicons-react";
import { useParams } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/ui/Breadcrumb";

import { ProjectBreadcrumbMenu } from "./ProjectBreadcrumbMenu";

export const ProjectBreadcrumbItem = () => {
  const { accountSlug, projectName } = useParams();
  const loggedIn = useIsLoggedIn();

  if (!projectName) {
    return null;
  }

  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink
          href={`${accountSlug}/${projectName}/builds`}
          aria-current="page"
        >
          <BreadcrumbItemIcon>
            <RepoIcon size={18} />
          </BreadcrumbItemIcon>
          {projectName}
        </BreadcrumbLink>
        {loggedIn && <ProjectBreadcrumbMenu />}
      </BreadcrumbItem>
    </>
  );
};
