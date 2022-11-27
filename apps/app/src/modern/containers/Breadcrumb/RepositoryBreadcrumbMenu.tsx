import { Link as RouterLink, useParams } from "react-router-dom";
import { RepoIcon } from "@primer/octicons-react";
import { graphql } from "@/gql";
import { BreadcrumbMenuButton } from "@/modern/ui/Breadcrumb";
import {
  useMenuState,
  MenuTitle,
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuState,
  MenuText,
} from "@/modern/ui/Menu";
import { Link } from "@/modern/ui/Link";
import { useQuery } from "@apollo/client";

const OwnerQuery = graphql(`
  query RepositoryBreadcrumbMenu_owner($login: String!) {
    owner(login: $login) {
      id
      repositories(enabled: true) {
        id
        name
      }
    }
  }
`);

const Repositories = (props: { ownerLogin: string; menu: MenuState }) => {
  const { data, error } = useQuery(OwnerQuery, {
    variables: { login: props.ownerLogin },
  });
  if (error) return null;
  if (!data) return null;
  const repositoryLogins =
    data.owner?.repositories
      .map(({ name }) => name)
      .sort((repoA, repoB) => repoA.localeCompare(repoB)) ?? [];

  if (repositoryLogins.length === 0) {
    return <MenuText>No active repository found</MenuText>;
  }

  return (
    <>
      {repositoryLogins.map((repositoryLogin) => {
        return (
          <MenuItem key={repositoryLogin} state={props.menu} pointer>
            {(menuItemProps) => (
              <RouterLink
                {...menuItemProps}
                to={`${props.ownerLogin}/${repositoryLogin}`}
              >
                <MenuItemIcon>
                  <RepoIcon size={18} />
                </MenuItemIcon>
                {repositoryLogin}
              </RouterLink>
            )}
          </MenuItem>
        );
      })}
    </>
  );
};

export const RepositoryBreadcrumbMenu = () => {
  const { ownerLogin } = useParams();
  const menu = useMenuState({ placement: "bottom", gutter: 4 });

  if (!ownerLogin) return null;

  return (
    <>
      <BreadcrumbMenuButton state={menu} />

      <Menu aria-label="Repositories" state={menu}>
        <MenuTitle>Repositories</MenuTitle>
        {menu.open && <Repositories ownerLogin={ownerLogin} menu={menu} />}
        <MenuText>
          Don&apos;t see your repo?
          <br />
          <Link to={`/${ownerLogin}`}>Be sure to activate it →</Link>
        </MenuText>
      </Menu>
    </>
  );
};
