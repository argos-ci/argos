import { useQuery } from "@apollo/client/react";
import { FolderCodeIcon, PlusCircleIcon } from "lucide-react";
import { MenuSection } from "react-aria-components";
import { useParams } from "react-router-dom";

import { graphql } from "@/gql";
import { getAccountURL } from "@/pages/Account/AccountParams";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuLoader,
  MenuText,
  MenuTitle,
} from "@/ui/Menu";

const AccountQuery = graphql(`
  query ProjectBreadcrumbMenu_account($slug: String!) {
    account(slug: $slug) {
      id
      projects(first: 100, after: 0) {
        edges {
          id
          name
        }
      }
    }
  }
`);

function Projects(props: { accountSlug: string }) {
  const { data, error } = useQuery(AccountQuery, {
    variables: { slug: props.accountSlug },
  });

  if (error) {
    throw error;
  }

  if (!data) {
    return <MenuLoader />;
  }

  const projectNames =
    data.account?.projects.edges
      .map(({ name }) => name)
      .sort((sa, sb) => sa.localeCompare(sb)) ?? [];

  if (projectNames.length === 0) {
    return <MenuText>No active project found</MenuText>;
  }

  return projectNames.map((projectName) => {
    return (
      <MenuItem key={projectName} href={`${props.accountSlug}/${projectName}`}>
        <MenuItemIcon>
          <FolderCodeIcon size={18} />
        </MenuItemIcon>
        {projectName}
      </MenuItem>
    );
  });
}

export function ProjectBreadcrumbMenu() {
  const { accountSlug } = useParams();

  if (!accountSlug) {
    return null;
  }

  return (
    <Menu>
      <MenuSection>
        <MenuTitle>Switch project</MenuTitle>
        <Projects accountSlug={accountSlug} />
      </MenuSection>
      <MenuItem href={`${getAccountURL({ accountSlug })}/new`}>
        <MenuItemIcon>
          <PlusCircleIcon />
        </MenuItemIcon>
        Create a Project
      </MenuItem>
    </Menu>
  );
}
