import {
  LogOutIcon,
  SettingsIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  PlusCircleIcon,
  CommandIcon,
  MessagesSquareIcon,
  FileTextIcon,
  ActivitySquareIcon,
} from "lucide-react";

import { Link, Link as RouterLink, useLocation } from "react-router-dom";

import { useAuthTokenPayload, useIsLoggedIn, logout } from "@/containers/Auth";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItemIcon,
  MenuItemShortcut,
  MenuSeparator,
  useMenuState,
} from "@/ui/Menu";
import {
  Select,
  SelectArrow,
  SelectItem,
  SelectPopover,
  useSelectState,
} from "@/ui/Select";

import { ColorMode, useColorMode } from "./ColorMode";
import { Button } from "@/ui/Button";
import { AccountAvatar } from "./AccountAvatar";
import { graphql } from "@/gql";
import { useQuery } from "@apollo/client";
import { InitialAvatar } from "./InitialAvatar";
import { useBuildHotkeysDialogState } from "@/pages/Build/BuildHotkeysDialogState";
import { HeadlessAnchor } from "@/ui/Link";

const getColorModeLabel = (colorMode: ColorMode | "") => {
  switch (colorMode) {
    case ColorMode.Dark:
      return (
        <>
          <MoonIcon className="h-[1em] w-[1em]" /> Dark
        </>
      );
    case ColorMode.Light:
      return (
        <>
          <SunIcon className="h-[1em] w-[1em]" /> Light
        </>
      );
    default:
      return (
        <>
          <MonitorIcon className="h-[1em] w-[1em]" /> System
        </>
      );
  }
};

const ColorModeSelect = () => {
  const { colorMode, setColorMode } = useColorMode();
  const value = colorMode ?? "";
  const select = useSelectState({
    gutter: 4,
    value: value,
    setValue: (value) => {
      setColorMode((value as ColorMode) || null);
    },
  });

  return (
    <>
      <Select state={select} size="sm">
        {getColorModeLabel(value)} <SelectArrow />
      </Select>
      <SelectPopover aria-label="Themes" state={select} portal>
        <SelectItem state={select} value="">
          {getColorModeLabel("")}
        </SelectItem>
        <SelectItem state={select} value={ColorMode.Dark}>
          {getColorModeLabel(ColorMode.Dark)}
        </SelectItem>
        <SelectItem state={select} value={ColorMode.Light}>
          {getColorModeLabel(ColorMode.Light)}
        </SelectItem>
      </SelectPopover>
    </>
  );
};

const AccountQuery = graphql(`
  query NavUserControl_account($slug: String!) {
    account(slug: $slug) {
      id
      avatar {
        ...AccountAvatarFragment
      }
    }
  }
`);

const Avatar = (props: { slug: string }) => {
  const { data, error } = useQuery(AccountQuery, {
    variables: { slug: props.slug },
  });
  if (error) {
    throw error;
  }

  if (!data) {
    return <InitialAvatar initial="" color="#eee" />;
  }

  if (!data?.account) {
    return null;
  }

  return <AccountAvatar avatar={data.account.avatar} />;
};

const UserMenu = () => {
  const authPayload = useAuthTokenPayload();
  const menu = useMenuState({
    placement: "bottom-end",
    gutter: 4,
  });
  const { hotkeysDialog } = useBuildHotkeysDialogState();

  if (!authPayload) return null;

  return (
    <>
      <MenuButton
        state={menu}
        className="rounded-full transition hover:brightness-125 focus:outline-none focus:brightness-125 aria-expanded:brightness-125 shrink-0"
      >
        <Avatar slug={authPayload.account.slug} />
      </MenuButton>
      <Menu aria-label="User settings" state={menu} className="w-60">
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
                <PlusCircleIcon />
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
                <SettingsIcon />
              </MenuItemIcon>
              Personal Settings
            </RouterLink>
          )}
        </MenuItem>
        <MenuSeparator />
        <div className="my-2 flex items-center justify-between gap-4 px-4 text-sm">
          Theme
          <ColorModeSelect />
        </div>
        <MenuSeparator />
        {hotkeysDialog && (
          <MenuItem state={menu} pointer onClick={() => hotkeysDialog.toggle()}>
            <MenuItemIcon>
              <CommandIcon />
            </MenuItemIcon>
            Keyboard shortcuts
            <MenuItemShortcut>?</MenuItemShortcut>
          </MenuItem>
        )}
        <MenuItem state={menu} pointer>
          {(menuItemProps) => (
            <HeadlessAnchor
              {...menuItemProps}
              href="https://argos-ci.com/docs/open-source"
              external
            >
              <MenuItemIcon>
                <FileTextIcon />
              </MenuItemIcon>
              Documentation
            </HeadlessAnchor>
          )}
        </MenuItem>
        <MenuItem state={menu} pointer>
          {(menuItemProps) => (
            <HeadlessAnchor
              {...menuItemProps}
              href="https://argos-ci.com/discord"
              external
            >
              <MenuItemIcon>
                <MessagesSquareIcon />
              </MenuItemIcon>
              Discord community
            </HeadlessAnchor>
          )}
        </MenuItem>
        <MenuItem state={menu} pointer>
          {(menuItemProps) => (
            <HeadlessAnchor
              {...menuItemProps}
              href="https://argos.openstatus.dev"
              external
            >
              <MenuItemIcon>
                <ActivitySquareIcon />
              </MenuItemIcon>
              Status
            </HeadlessAnchor>
          )}
        </MenuItem>
        <MenuSeparator />
        <MenuItem state={menu} pointer onClick={() => logout()}>
          <MenuItemIcon>
            <LogOutIcon />
          </MenuItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
};

const LoginButton = () => {
  const { pathname } = useLocation();
  const url = `/login?r=${encodeURIComponent(pathname)}`;
  return (
    <Button className="shrink-0" color="neutral" variant="outline">
      {(buttonProps) => (
        <Link {...buttonProps} to={url}>
          Login
        </Link>
      )}
    </Button>
  );
};

export const NavUserControl = () => {
  const loggedIn = useIsLoggedIn();
  return loggedIn ? <UserMenu /> : <LoginButton />;
};
