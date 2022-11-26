import {
  GearIcon,
  HomeIcon,
  RepoIcon,
  SignOutIcon,
} from "@primer/octicons-react";
import { Link as RouterLink } from "react-router-dom";

import config from "@/config";
import { useLogout } from "@/containers/Auth";
import { useUser } from "@/containers/User";
import { BrandLogo } from "@/ui/BrandLogo";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItemIcon,
  MenuSeparator,
  useMenuState,
} from "@/ui/Menu";
import { MagicTooltip } from "@/ui/Tooltip";

import { GitHubLoginButton } from "./GitHub";
import { OwnerAvatar } from "./OwnerAvatar";
import { SubNavbar } from "./SubNavbar";

const UserMenu = () => {
  const user = useUser() as NonNullable<ReturnType<typeof useUser>>;
  const logout = useLogout();
  const menu = useMenuState({
    placement: "bottom-end",
    gutter: 4,
  });

  return (
    <>
      <MenuButton
        state={menu}
        className="rounded-full transition hover:brightness-125 focus:outline-none focus:brightness-125 aria-expanded:brightness-125"
      >
        <OwnerAvatar owner={user} />
      </MenuButton>
      <Menu aria-label="User settings" state={menu}>
        <MenuItem state={menu} pointer>
          {(menuItemProps) => (
            <RouterLink {...menuItemProps} to="/">
              <MenuItemIcon>
                <HomeIcon />
              </MenuItemIcon>
              Home
            </RouterLink>
          )}
        </MenuItem>
        <MenuSeparator />
        <MenuItem state={menu} pointer>
          {(menuItemProps) => (
            <a
              {...menuItemProps}
              href={config.get("github.appUrl")}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MenuItemIcon>
                <RepoIcon />
              </MenuItemIcon>
              Add repository
            </a>
          )}
        </MenuItem>
        <MenuItem state={menu} pointer>
          {(menuItemProps) => (
            <RouterLink {...menuItemProps} to={`/${user.login}/settings`}>
              <MenuItemIcon>
                <GearIcon />
              </MenuItemIcon>
              Settings
            </RouterLink>
          )}
        </MenuItem>
        <MenuSeparator />
        <MenuItem state={menu} pointer onClick={() => logout()}>
          <MenuItemIcon>
            <SignOutIcon />
          </MenuItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
};

const UserControl = () => {
  const user = useUser();
  return user ? <UserMenu /> : <GitHubLoginButton />;
};

export const Navbar = () => {
  return (
    <nav className="container mx-auto flex items-center justify-between p-4">
      <div className="flex flex-shrink-0 items-center">
        <MagicTooltip tooltip="Go to home">
          <RouterLink to="/" className="transition hover:brightness-125">
            <BrandLogo height={32} className="max-w-none" />
          </RouterLink>
        </MagicTooltip>
        <SubNavbar />
      </div>

      <div className="flex flex-shrink-0 items-center gap-6">
        <a
          href="https://discord.gg/WjzGrQGS4A"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-on-light transition hover:text-on"
        >
          Help & Community
        </a>
        <a
          href="https://docs.argos-ci.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-on-light transition hover:text-on"
        >
          Docs
        </a>
        <UserControl />
      </div>
    </nav>
  );
};
