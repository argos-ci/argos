import React from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Box,
  Menu,
  MenuItem,
  MenuDisclosure,
  useMenuState,
} from "@smooth-ui/core-sc";
import { useColorMode } from "@xstyled/styled-components";
import { FaGithub } from "react-icons/fa";
import config from "../config";
import {
  NavbarSecondary,
  NavbarBrandLink,
  Navbar,
  NavbarBrand,
  BrandLogo,
} from "../components";
import { OwnerAvatar } from "./OwnerAvatar";
import { useLogout } from "./Auth";
import { useUser } from "./User";

// eslint-disable-next-line react/forbid-foreign-prop-types
delete MenuDisclosure.propTypes.children;

function UserMenu({ user }) {
  const logout = useLogout();
  const menu = useMenuState({
    placement: "bottom-end",
    gutter: 4,
  });

  return (
    <>
      <MenuDisclosure {...menu}>
        {({ type, ...disclosureProps }) => (
          <OwnerAvatar owner={user} {...disclosureProps} />
        )}
      </MenuDisclosure>
      <Menu aria-label="User settings" {...menu}>
        <MenuItem {...menu} forwardedAs={Link} to={`/`}>
          Home
        </MenuItem>
        <MenuItem {...menu} forwardedAs={Link} to={`/${user.login}/settings`}>
          Settings
        </MenuItem>
        <MenuItem
          {...menu}
          forwardedAs="a"
          href={config.get("github.appUrl")}
          target="_blank"
          rel="noopener noreferrer"
        >
          Add repository
        </MenuItem>
        <MenuItem {...menu} onClick={() => logout()}>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
}

export function AppNavbar() {
  const user = useUser();
  const [colorMode] = useColorMode();

  return (
    <Navbar>
      <NavbarBrandLink as={Link} to="/">
        <NavbarBrand>
          <BrandLogo width={200} colorMode={colorMode} />
        </NavbarBrand>
      </NavbarBrandLink>
      <NavbarSecondary>
        {user ? (
          <UserMenu user={user} />
        ) : (
          <Button
            variant="light200"
            as="a"
            href={config.get("github.loginUrl")}
            display="flex"
            alignItems="center"
          >
            <Box as="span" mr={1}>
              Login
            </Box>
            <FaGithub />
          </Button>
        )}
      </NavbarSecondary>
    </Navbar>
  );
}
