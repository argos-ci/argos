import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client";
import { RepoIcon } from "@primer/octicons-react";
import { PlusCircleIcon } from "lucide-react";
import { Link as RouterLink, useParams } from "react-router-dom";

import { graphql } from "@/gql";
import { BreadcrumbMenuButton } from "@/ui/Breadcrumb";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuLoader,
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

function Projects(props: { accountSlug: string; menu: MenuState }) {
  const { data } = useSuspenseQuery(AccountQuery, {
    variables: { slug: props.accountSlug },
  });
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
}

export function ProjectBreadcrumbMenu() {
  const { accountSlug } = useParams();
  const menu = useMenuState({ placement: "bottom", gutter: 4 });

  if (!accountSlug) {
    return null;
  }

  const title = "Switch project";

  return (
    <>
      <BreadcrumbMenuButton state={menu} />
      <Menu aria-label={title} state={menu}>
        <MenuTitle>{title}</MenuTitle>
        <Suspense fallback={<MenuLoader />}>
          {menu.open && <Projects accountSlug={accountSlug} menu={menu} />}
        </Suspense>
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
}
