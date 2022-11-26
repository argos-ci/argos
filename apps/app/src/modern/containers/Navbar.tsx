import { BrandLogo } from "@/modern/ui/BrandLogo";
import { Link as RouterLink } from "react-router-dom";
import { MagicTooltip } from "@/modern/ui/Tooltip";
import { useUser } from "@/containers/User";

import { GitHubLoginButton } from "./GitHub";
import {
  useMenuState,
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuSeparator,
  MenuButton,
} from "@/modern/ui/Menu";
import {
  GearIcon,
  HomeIcon,
  RepoIcon,
  SignOutIcon,
} from "@primer/octicons-react";
import { useLogout } from "@/containers/Auth";
import config from "@/config";
import { OwnerAvatar } from "./OwnerAvatar";

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
      <div className="flex flex-shrink-0 items-center gap-6">
        <MagicTooltip tooltip="Go to home">
          <RouterLink to="/" className=" ransition hover:brightness-125">
            <BrandLogo height={32} />
          </RouterLink>
        </MagicTooltip>
        <a
          href="https://docs.argos-ci.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-on-light transition hover:text-on"
        >
          Docs
        </a>
        <a
          href="https://discord.gg/WjzGrQGS4A"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-on-light transition hover:text-on"
        >
          Help
        </a>
      </div>

      <div className="flex-shrink-0">
        <UserControl />
      </div>
    </nav>
  );
};
