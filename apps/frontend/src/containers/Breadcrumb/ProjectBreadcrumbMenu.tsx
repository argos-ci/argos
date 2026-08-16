import { useQuery } from "@apollo/client/react";
import { FolderCodeIcon, PlusCircleIcon } from "lucide-react";
import { useParams } from "react-router";

import { graphql } from "@/gql";
import { getAccountURL } from "@/pages/Account/AccountParams";
import {
  Menu,
  MenuHeading,
  MenuItem,
  MenuLoader,
  MenuSection,
  MenuText,
} from "@/ui/menu-kit";

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

/**
 * The project rows, as a function rather than a component: a menu reads its
 * children and cannot see inside one.
 */
function getProjectItems(
  accountSlug: string,
  data: ReturnType<typeof useProjectsQuery>["data"],
) {
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

function useProjectsQuery(accountSlug: string) {
  return useQuery(AccountQuery, { variables: { slug: accountSlug } });
}

export function ProjectBreadcrumbMenu() {
  const { accountSlug } = useParams();
  const { data, error } = useProjectsQuery(accountSlug ?? "");

  if (error) {
    throw error;
  }

  if (!accountSlug) {
    return null;
  }

  return (
    <Menu side="bottom" align="start">
      <MenuSection>
        <MenuHeading>Switch project</MenuHeading>
        {getProjectItems(accountSlug, data)}
      </MenuSection>
      <MenuItem
        icon={<PlusCircleIcon />}
        href={`${getAccountURL({ accountSlug })}/new`}
      >
        Create a Project
      </MenuItem>
    </Menu>
  );
}
