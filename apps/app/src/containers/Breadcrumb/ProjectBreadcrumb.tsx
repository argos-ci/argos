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
  const { accountSlug, projectSlug } = useParams();
  const loggedIn = useIsLoggedIn();

  if (!projectSlug) return null;

  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink
          to={`${accountSlug}/${projectSlug}/builds`}
          aria-current="page"
        >
          <BreadcrumbItemIcon>
            <RepoIcon size={18} />
          </BreadcrumbItemIcon>
          {projectSlug}
        </BreadcrumbLink>
        {loggedIn && <ProjectBreadcrumbMenu />}
      </BreadcrumbItem>
    </>
  );
};
