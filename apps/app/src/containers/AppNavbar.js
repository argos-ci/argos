import React from "react";
import { x } from "@xstyled/styled-components";
import {
  GoHome,
  GoRepo,
  GoGear,
  GoSignOut,
  GoMarkGithub,
} from "react-icons/go";
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
  Icon,
  LinkBlock,
  BaseLink,
} from "@argos-ci/app/src/components";
import config from "../config";
import { OwnerAvatar } from "./OwnerAvatar";
import { useLogout } from "./Auth";
import { useUser } from "./User";
import { OwnerBreadcrumbItem } from "./Breadcrumb/OwnerBreadcrumb";
import { HomeBreadcrumbItem } from "./Breadcrumb/HomeBreadcrumb";
import { RepositoryBreadcrumbItem } from "./Breadcrumb/RepositoryBreadcrumb";

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
        <MenuItem state={menu} as={LinkBlock} to={`/`}>
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
        <MenuItem state={menu} as={LinkBlock} to={`/${user.login}/settings`}>
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
        <NavbarBrandLink as={BaseLink} to="/">
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
              <Icon as={GoMarkGithub} />
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
