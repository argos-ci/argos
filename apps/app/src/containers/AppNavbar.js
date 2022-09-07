import * as React from "react";
import {
  HomeIcon,
  RepoIcon,
  GearIcon,
  SignOutIcon,
  MarkGithubIcon,
} from "@primer/octicons-react";
import {
  BaseLink,
  BrandLogo,
  Button,
  Icon,
  LinkBlock,
  Menu,
  MenuButton,
  MenuIcon,
  MenuItem,
  MenuSeparator,
  Navbar,
  NavbarBrand,
  NavbarBrandLink,
  NavbarSecondary,
  useMenuState,
} from "@argos-ci/app/src/components";
import config from "../config";
import { OwnerAvatar } from "./OwnerAvatar";
import { useLogout } from "./Auth";
import { useUser } from "./User";

const UserMenu = ({ user }) => {
  const logout = useLogout();
  const menu = useMenuState({
    placement: "bottom-end",
    gutter: 4,
  });

  return (
    <>
      <MenuButton state={menu}>
        <OwnerAvatar owner={user} />
      </MenuButton>
      <Menu aria-label="User settings" state={menu}>
        <MenuItem state={menu} as={LinkBlock} to="/">
          <MenuIcon as={HomeIcon} />
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
          <MenuIcon as={RepoIcon} />
          Add repository
        </MenuItem>
        <MenuItem state={menu} as={LinkBlock} to={`/${user.login}/settings`}>
          <MenuIcon as={GearIcon} />
          Settings
        </MenuItem>
        <MenuSeparator />
        <MenuItem state={menu} cursor="pointer" onClick={() => logout()}>
          <MenuIcon as={SignOutIcon} />
          Logout
        </MenuItem>
      </Menu>
    </>
  );
};

export function AppNavbar() {
  const user = useUser();

  return (
    <>
      <Navbar>
        <NavbarBrandLink as={BaseLink} to="/">
          <NavbarBrand>
            <BrandLogo height={32} />
          </NavbarBrand>
        </NavbarBrandLink>
        <NavbarSecondary>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Button
              as="a"
              href={`${config.get("github.loginUrl")}&redirect_uri=${
                window.location.origin
              }/auth/github/callback?r=${encodeURIComponent(
                window.location.pathname
              )}`}
              variant="neutral"
              gap={2}
            >
              <Icon as={MarkGithubIcon} />
              Login
            </Button>
          )}
        </NavbarSecondary>
      </Navbar>
    </>
  );
}
