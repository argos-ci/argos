import React from "react";
import { Link } from "react-router-dom";
import { x } from "@xstyled/styled-components";
import { FaGithub } from "react-icons/fa";
import config from "../config";
import { createTeleporter } from "react-teleporter";
import {
  NavbarSecondary,
  NavbarBrandLink,
  Navbar,
  NavbarBrand,
  BrandLogo,
  Button,
  Menu,
  MenuItem,
  MenuButton,
  useMenuState,
  Header,
  HeaderBody,
  HeaderPrimary,
  Breadcrumb,
  MenuIcon,
  MenuSeparator,
  MenuTitle,
} from "@argos-ci/app/src/components";
import { OwnerAvatar } from "./OwnerAvatar";
import { useLogout } from "./Auth";
import { useUser } from "./User";
import { OwnerBreadcrumbItem } from "./OwnerBreadcrumb";
import { GoHome, GoRepo, GoGear, GoSignOut } from "react-icons/go";
import { HomeBreadcrumbItem } from "./HomeBreadcrumb";
import { RepositoryBreadcrumbItem } from "./RepositoryBreadcrumb";

const HeaderBodyTeleporter = createTeleporter();

export function HeaderTeleporter({ children }) {
  return <HeaderBodyTeleporter.Source>{children}</HeaderBodyTeleporter.Source>;
}

function UserMenu({ user, ...props }) {
  const logout = useLogout();
  const menu = useMenuState({
    placement: "bottom-end",
    gutter: 4,
  });

  return (
    <x.div {...props}>
      <MenuButton state={menu}>
        <OwnerAvatar owner={user} />
      </MenuButton>
      <Menu aria-label="User settings" state={menu}>
        <MenuTitle>User menu</MenuTitle>
        <MenuSeparator />
        <MenuItem state={menu} as={Link} to={`/`}>
          <MenuIcon as={GoHome} />
          Home
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          state={menu}
          as="a"
          href={config.get("github.appUrl")}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MenuIcon as={GoRepo} />
          Add repository
        </MenuItem>
        <MenuItem state={menu} as={Link} to={`/${user.login}/settings`}>
          <MenuIcon as={GoGear} />
          Settings
        </MenuItem>
        <MenuSeparator />
        <MenuItem state={menu} onClick={() => logout()}>
          <MenuIcon as={GoSignOut} />
          Logout
        </MenuItem>
      </Menu>
    </x.div>
  );
}

export function AppNavbar() {
  const user = useUser();

  return (
    <>
      <Navbar>
        <NavbarBrandLink as={Link} to="/">
          <NavbarBrand>
            <BrandLogo width={200} />
          </NavbarBrand>
        </NavbarBrandLink>
        <NavbarSecondary>
          {user ? (
            <UserMenu user={user} mt={-1} />
          ) : (
            <Button
              as="a"
              href={config.get("github.loginUrl")}
              variant="neutral"
              gap={2}
            >
              <x.svg as={FaGithub} />
              Login
            </Button>
          )}
        </NavbarSecondary>
      </Navbar>

      <Header>
        <HeaderBody>
          <HeaderPrimary>
            <Breadcrumb>
              <HomeBreadcrumbItem />
              <OwnerBreadcrumbItem />
              <RepositoryBreadcrumbItem />
            </Breadcrumb>
          </HeaderPrimary>
          <HeaderBodyTeleporter.Target />
        </HeaderBody>
      </Header>
    </>
  );
}
