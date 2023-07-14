import { useQuery } from "@apollo/client";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { RepoIcon } from "@primer/octicons-react";
import { Link as RouterLink, useParams } from "react-router-dom";

import { graphql } from "@/gql";
import { BreadcrumbMenuButton } from "@/ui/Breadcrumb";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuState,
  MenuText,
  MenuTitle,
  useMenuState,
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

const Repositories = (props: { accountSlug: string; menu: MenuState }) => {
  const { data, error } = useQuery(AccountQuery, {
    variables: { slug: props.accountSlug },
  });
  if (error) return null;
  if (!data) return null;
  const projectNames =
    data.account?.projects.edges
      .map(({ name }) => name)
      .sort((sa, sb) => sa.localeCompare(sb)) ?? [];

  if (projectNames.length === 0) {
    return <MenuText>No active project found</MenuText>;
  }

  return (
    <>
      {projectNames.map((projectName) => {
        return (
          <MenuItem key={projectName} state={props.menu} pointer>
            {(menuItemProps) => (
              <RouterLink
                {...menuItemProps}
                to={`${props.accountSlug}/${projectName}`}
              >
                <MenuItemIcon>
                  <RepoIcon size={18} />
                </MenuItemIcon>
                {projectName}
              </RouterLink>
            )}
          </MenuItem>
        );
      })}
    </>
  );
};

export const ProjectBreadcrumbMenu = () => {
  const { accountSlug } = useParams();
  const menu = useMenuState({ placement: "bottom", gutter: 4 });

  if (!accountSlug) return null;

  const title = "Switch project";

  return (
    <>
      <BreadcrumbMenuButton state={menu} />

      <Menu aria-label={title} state={menu}>
        <MenuTitle>{title}</MenuTitle>
        {menu.open && <Repositories accountSlug={accountSlug} menu={menu} />}
        <MenuItem state={menu} pointer>
          {(menuItemProps) => (
            <RouterLink {...menuItemProps} to={`/${accountSlug}/new`}>
              <MenuItemIcon>
                <PlusCircleIcon />
              </MenuItemIcon>
              Create a Project
            </RouterLink>
          )}
        </MenuItem>
      </Menu>
    </>
  );
};
