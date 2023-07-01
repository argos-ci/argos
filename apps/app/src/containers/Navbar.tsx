import {
  ArrowLeftOnRectangleIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { Link as RouterLink } from "react-router-dom";

import {
  useAuthTokenPayload,
  useIsLoggedIn,
  useLogout,
} from "@/containers/Auth";
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
import { ImageAvatar } from "./ImageAvatar";
import { SubNavbar } from "./SubNavbar";

const UserMenu = () => {
  const authPayload = useAuthTokenPayload();
  const logout = useLogout();
  const menu = useMenuState({
    placement: "bottom-end",
    gutter: 4,
  });

  if (!authPayload) return null;

  return (
    <>
      <MenuButton
        state={menu}
        className="rounded-full transition hover:brightness-125 focus:outline-none focus:brightness-125 aria-expanded:brightness-125"
      >
        <ImageAvatar
          url={`https://github.com/${authPayload.account.slug}.png`}
        />
      </MenuButton>
      <Menu aria-label="User settings" state={menu}>
        <MenuItem state={menu} pointer>
          {(menuItemProps) => (
            <RouterLink
              {...menuItemProps}
              to={`/${authPayload.account.slug}/new`}
            >
              <MenuItemIcon>
                <PlusCircleIcon />
              </MenuItemIcon>
              New Project
            </RouterLink>
          )}
        </MenuItem>
        <MenuItem state={menu} pointer>
          {(menuItemProps) => (
            <RouterLink {...menuItemProps} to={`/teams/new`}>
              <MenuItemIcon>
                <UserPlusIcon />
              </MenuItemIcon>
              New Team
            </RouterLink>
          )}
        </MenuItem>
        <MenuItem state={menu} pointer>
          {(menuItemProps) => (
            <RouterLink
              {...menuItemProps}
              to={`/${authPayload.account.slug}/settings`}
            >
              <MenuItemIcon>
                <Cog6ToothIcon />
              </MenuItemIcon>
              Personal Settings
            </RouterLink>
          )}
        </MenuItem>
        <MenuSeparator />
        <MenuItem state={menu} pointer onClick={() => logout()}>
          <MenuItemIcon>
            <ArrowLeftOnRectangleIcon />
          </MenuItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
};

const UserControl = () => {
  const loggedIn = useIsLoggedIn();
  return loggedIn ? <UserMenu /> : <GitHubLoginButton />;
};

export const Navbar = () => {
  return (
    <nav className="container mx-auto flex items-center justify-between p-4">
      <div className="flex shrink-0 items-center">
        <MagicTooltip tooltip="Go to home">
          <RouterLink to="/" className="transition hover:brightness-125">
            <BrandLogo height={32} className="max-w-none" />
          </RouterLink>
        </MagicTooltip>
        <SubNavbar />
      </div>

      <div className="flex shrink-0 items-center gap-6">
        <a
          href="https://argos-ci.com/discord"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-on-light transition hover:text-on"
        >
          Help & Community
        </a>
        <a
          href="https://argos-ci.com/docs"
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
