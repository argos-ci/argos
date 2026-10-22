import type { ComponentProps } from "react";
import { FolderCodeIcon, PlusCircleIcon } from "lucide-react";

import { getAccountURL } from "@/pages/Account/AccountParams";
import {
  Menu,
  MenuHeading,
  MenuItem,
  MenuSection,
  MenuText,
} from "@/ui/menu-kit";

/**
 * The project rows, as a function rather than a component: a menu reads its
 * children and cannot see inside one.
 */
function getProjectItems(accountSlug: string, projectNames: string[]) {
  if (projectNames.length === 0) {
    return <MenuText>No active project found</MenuText>;
  }

  return projectNames.map((projectName) => {
    return (
      <MenuItem
        icon={<FolderCodeIcon size={18} />}
        key={projectName}
        href={`${accountSlug}/${projectName}`}
      >
        {projectName}
      </MenuItem>
    );
  });
}

/** The project rows and "Create a Project", for a menu built elsewhere too. */
export function getProjectMenuSection(
  accountSlug: string,
  projectNames: string[],
  heading = "Switch project",
) {
  const sortedNames = [...projectNames].sort((sa, sb) => sa.localeCompare(sb));
  return (
    <>
      <MenuSection>
        <MenuHeading>{heading}</MenuHeading>
        {getProjectItems(accountSlug, sortedNames)}
      </MenuSection>
      <MenuItem
        icon={<PlusCircleIcon />}
        href={`${getAccountURL({ accountSlug })}/new`}
      >
        Create a Project
      </MenuItem>
    </>
  );
}

/**
 * Renders from a list the breadcrumb has already resolved, never from a query
 * of its own: a menu's rows are read when it opens and filtered as you type,
 * so they have to all be there from the start.
 */
export function ProjectBreadcrumbMenu(props: {
  accountSlug: string;
  projectNames: string[];
  anchor?: ComponentProps<typeof Menu>["anchor"];
}) {
  return (
    <Menu side="bottom" align="start" anchor={props.anchor}>
      {getProjectMenuSection(props.accountSlug, props.projectNames)}
    </Menu>
  );
}
