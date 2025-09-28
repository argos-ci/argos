import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import clsx from "clsx";
import {
  ActivitySquareIcon,
  CommandIcon,
  FileTextIcon,
  LogOutIcon,
  MessagesSquareIcon,
  MonitorIcon,
  MoonIcon,
  PlusCircleIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react";
import { Button as RACButton, SubmenuTrigger } from "react-aria-components";
import { useLocation } from "react-router-dom";

import { logout, useAuthTokenPayload, useIsLoggedIn } from "@/containers/Auth";
import { graphql } from "@/gql";
import { getAccountURL } from "@/pages/Account/AccountParams";
import { LinkButton } from "@/ui/Button";
import { ColorMode, useColorMode } from "@/ui/ColorMode";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuItemShortcut,
  MenuSeparator,
  MenuTrigger,
} from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

import { AccountAvatar } from "./AccountAvatar";
import { useBuildHotkeysDialogState } from "./Build/BuildHotkeysDialogState";
import { InitialAvatar } from "./InitialAvatar";

function getColorModeIcon(colorMode: ColorMode | "system") {
  switch (colorMode) {
    case ColorMode.Dark:
      return <MoonIcon />;
    case ColorMode.Light:
      return <SunIcon />;
    default:
      return <MonitorIcon />;
  }
}

function getColorModeLabel(colorMode: ColorMode | "system") {
  switch (colorMode) {
    case ColorMode.Dark:
      return "Dark";
    case ColorMode.Light:
      return "Light";
    default:
      return "System";
  }
}

function ColorModeSubmenu() {
  const { colorMode, setColorMode } = useColorMode();
  const value = colorMode ?? "system";
  const selected = useMemo(
    () => new Set<ColorMode | "system">([value]),
    [value],
  );

  return (
    <SubmenuTrigger>
      <MenuItem>
        <MenuItemIcon>{getColorModeIcon(value)}</MenuItemIcon>
        Theme ({getColorModeLabel(value)})
      </MenuItem>
      <Popover>
        <Menu
          aria-label="Color modes"
          selectionMode="single"
          selectedKeys={selected}
          onSelectionChange={(selection) => {
            const value = Array.from(selection as Set<ColorMode | "system">)[0];
            setColorMode(!value || value === "system" ? null : value);
          }}
        >
          <MenuItem id="system">
            <MenuItemIcon>{getColorModeIcon("system")}</MenuItemIcon>
            {getColorModeLabel("system")}
          </MenuItem>
          <MenuItem id={ColorMode.Dark}>
            <MenuItemIcon>{getColorModeIcon(ColorMode.Dark)}</MenuItemIcon>
            {getColorModeLabel(ColorMode.Dark)}
          </MenuItem>
          <MenuItem id={ColorMode.Light}>
            <MenuItemIcon>{getColorModeIcon(ColorMode.Light)}</MenuItemIcon>
            {getColorModeLabel(ColorMode.Light)}
          </MenuItem>
        </Menu>
      </Popover>
    </SubmenuTrigger>
  );
}

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

function Avatar(props: { slug: string; className?: string }) {
  const { data, error } = useQuery(AccountQuery, {
    variables: { slug: props.slug },
  });

  if (error) {
    throw error;
  }

  if (!data) {
    return (
      <InitialAvatar initial="" color="var(--mauve-3)" className="size-7" />
    );
  }

  if (!data.account) {
    return null;
  }

  return (
    <AccountAvatar avatar={data.account.avatar} className={props.className} />
  );
}

function UserMenu() {
  const authPayload = useAuthTokenPayload();
  const hotkeysDialog = useBuildHotkeysDialogState();

  if (!authPayload) {
    return null;
  }

  return (
    <MenuTrigger>
      <RACButton
        className={clsx(
          "rac-focus bg-ui size-8 shrink-0 cursor-default rounded-full border-2 transition",
          "data-[hovered]:border-primary-hover data-[pressed]:border-primary-active aria-expanded:border-primary-active",
        )}
        aria-label="User settings"
      >
        <Avatar slug={authPayload.account.slug} className="size-7" />
      </RACButton>
      <Popover placement="bottom end">
        <Menu className="w-60">
          <MenuItem
            href={`${getAccountURL({ accountSlug: authPayload.account.slug })}/new`}
          >
            <MenuItemIcon>
              <PlusCircleIcon />
            </MenuItemIcon>
            New Project
          </MenuItem>
          <MenuItem href="/teams/new">
            <MenuItemIcon>
              <PlusCircleIcon />
            </MenuItemIcon>
            New Team
          </MenuItem>
          <MenuItem
            href={`${getAccountURL({ accountSlug: authPayload.account.slug })}/settings`}
          >
            <MenuItemIcon>
              <SettingsIcon />
            </MenuItemIcon>
            Settings
          </MenuItem>
          <MenuSeparator />
          <ColorModeSubmenu />
          <MenuSeparator />
          {hotkeysDialog && (
            <MenuItem onAction={() => hotkeysDialog.setIsOpen(true)}>
              <MenuItemIcon>
                <CommandIcon />
              </MenuItemIcon>
              Keyboard shortcuts
              <MenuItemShortcut>?</MenuItemShortcut>
            </MenuItem>
          )}
          <MenuItem
            href="https://argos-ci.com/docs/open-source"
            target="_blank"
          >
            <MenuItemIcon>
              <FileTextIcon />
            </MenuItemIcon>
            Documentation
          </MenuItem>
          <MenuItem href="https://argos-ci.com/discord" target="_blank">
            <MenuItemIcon>
              <MessagesSquareIcon />
            </MenuItemIcon>
            Discord community
          </MenuItem>
          <MenuItem href="https://argos.openstatus.dev" target="_blank">
            <MenuItemIcon>
              <ActivitySquareIcon />
            </MenuItemIcon>
            Status
          </MenuItem>
          <MenuSeparator />
          <MenuItem onAction={() => logout()}>
            <MenuItemIcon>
              <LogOutIcon />
            </MenuItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

function LoginButton() {
  const { pathname } = useLocation();
  const url = `/login?r=${encodeURIComponent(pathname)}`;
  return (
    <LinkButton className="shrink-0" variant="secondary" href={url}>
      Login
    </LinkButton>
  );
}

export function NavUserControl() {
  const loggedIn = useIsLoggedIn();
  return loggedIn ? <UserMenu /> : <LoginButton />;
}
