import { FolderCode } from "lucide-react";
import { MenuTrigger } from "react-aria-components";
import { useMatch } from "react-router";

import { useAuth } from "@/containers/Auth";
import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLink,
  BreadcrumbMenuButton,
} from "@/ui/Breadcrumb";
import { Popover } from "@/ui/Popover";

import { ProjectBreadcrumbMenu } from "./ProjectBreadcrumbMenu";

export function ProjectBreadcrumbItem(props: {
  accountSlug: string;
  projectName: string;
}) {
  const { accountSlug, projectName } = props;

  const auth = useAuth();
  const isCurrent = useMatch("/:accountSlug/:projectName/:any?");

  return (
    <BreadcrumbItem>
      <BreadcrumbLink
        href={`${accountSlug}/${projectName}/builds`}
        aria-current={isCurrent ? "page" : undefined}
      >
        <BreadcrumbItemIcon>
          <FolderCode size={18} />
        </BreadcrumbItemIcon>
        {projectName}
      </BreadcrumbLink>
      {auth.status === "authenticated" && (
        <MenuTrigger>
          <BreadcrumbMenuButton />
          <Popover placement="bottom start">
            <ProjectBreadcrumbMenu />
          </Popover>
        </MenuTrigger>
      )}
    </BreadcrumbItem>
  );
}
