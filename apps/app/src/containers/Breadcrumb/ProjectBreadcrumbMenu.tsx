import { useQuery } from "@apollo/client";
import { RepoIcon } from "@primer/octicons-react";
import { Link as RouterLink, useParams } from "react-router-dom";

import { graphql } from "@/gql";
import { BreadcrumbMenuButton } from "@/ui/Breadcrumb";
import { Link } from "@/ui/Link";
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
          slug
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
  const projectSlugs =
    data.account?.projects.edges
      .map(({ slug }) => slug)
      .sort((sa, sb) => sa.localeCompare(sb)) ?? [];

  if (projectSlugs.length === 0) {
    return <MenuText>No active project found</MenuText>;
  }

  return (
    <>
      {projectSlugs.map((projectSlug) => {
        return (
          <MenuItem key={projectSlug} state={props.menu} pointer>
            {(menuItemProps) => (
              <RouterLink
                {...menuItemProps}
                to={`${props.accountSlug}/${projectSlug}`}
              >
                <MenuItemIcon>
                  <RepoIcon size={18} />
                </MenuItemIcon>
                {projectSlug}
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
        <MenuText>
          Don&apos;t see your repo?
          <br />
          <Link to={`/${accountSlug}`}>Be sure to activate it →</Link>
        </MenuText>
      </Menu>
    </>
  );
};
