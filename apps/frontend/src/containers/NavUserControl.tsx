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
  ShieldUserIcon,
  SunIcon,
} from "lucide-react";
import { useLocation } from "react-router";

import { logout, useAuth, type AuthAccount } from "@/containers/Auth";
import { getAccountURL } from "@/pages/Account/AccountParams";
import { LinkButton } from "@/ui/Button";
import { ColorMode, useColorMode } from "@/ui/ColorMode";
import {
  Menu,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
  SubMenu,
  SubMenuContent,
} from "@/ui/menu-kit";

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

const COLOR_MODES = ["system", ColorMode.Dark, ColorMode.Light] as const;

/**
 * The theme submenu, as a function rather than a component: a menu reads its
 * children and cannot see inside one.
 */
function getColorModeSubmenu(
  value: ColorMode | "system",
  setColorMode: (mode: ColorMode | null) => void,
) {
  return (
    <SubMenu>
      <MenuItem icon={getColorModeIcon(value)}>
        Theme ({getColorModeLabel(value)})
      </MenuItem>
      <SubMenuContent>
        {COLOR_MODES.map((mode) => (
          <MenuItem
            key={mode}
            icon={getColorModeIcon(mode)}
            checked={value === mode}
            onAction={() => setColorMode(mode === "system" ? null : mode)}
          >
            {getColorModeLabel(mode)}
          </MenuItem>
        ))}
      </SubMenuContent>
    </SubMenu>
  );
}

function UserMenu(props: { account: AuthAccount }) {
  const { account } = props;
  const hotkeysDialog = useBuildHotkeysDialogState();
  const { colorMode, setColorMode } = useColorMode();

  return (
    <MenuRoot>
      <MenuTrigger>
        <button
          type="button"
          className={clsx(
            "focus-ring bg-ui size-8 shrink-0 cursor-default rounded-full border-2 transition",
            "enabled-hover:border-primary-hover active:border-primary-active aria-expanded:border-primary-active",
          )}
          aria-label="User settings"
        >
          <AccountAvatar avatar={account.avatar} className="size-7" />
        </button>
      </MenuTrigger>
      <Menu side="bottom" align="end" className="w-60">
        <MenuItem
          icon={<PlusCircleIcon />}
          href={`${getAccountURL({ accountSlug: account.slug })}/new`}
        >
          New Project
        </MenuItem>
        <MenuItem icon={<PlusCircleIcon />} href="/teams/new">
          New Team
        </MenuItem>
        <MenuItem
          icon={<SettingsIcon />}
          href={`${getAccountURL({ accountSlug: account.slug })}/settings`}
        >
          Settings
        </MenuItem>
        {account.staff ? (
          <>
            <MenuSeparator />
            <MenuItem icon={<ShieldUserIcon />} href="/staff">
              Staff
            </MenuItem>
          </>
        ) : null}
        <MenuSeparator />
        {getColorModeSubmenu(colorMode ?? "system", setColorMode)}
        <MenuSeparator />
        {hotkeysDialog && (
          <MenuItem
            icon={<CommandIcon />}
            keyboardShortcut={["?"]}
            onAction={() => hotkeysDialog.setIsOpen(true)}
          >
            Keyboard shortcuts
          </MenuItem>
        )}
        <MenuItem
          icon={<FileTextIcon />}
          href="https://argos-ci.com/docs/open-source"
          target="_blank"
        >
          Documentation
        </MenuItem>
        <MenuItem
          icon={<MessagesSquareIcon />}
          href="https://argos-ci.com/discord"
          target="_blank"
        >
          Discord community
        </MenuItem>
        <MenuItem
          icon={<ActivitySquareIcon />}
          href="https://argos.openstatus.dev"
          target="_blank"
        >
          Status
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<LogOutIcon />} onAction={() => logout()}>
          Logout
        </MenuItem>
      </Menu>
    </MenuRoot>
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
  const auth = useAuth();

  if (auth.status === "anonymous") {
    return <LoginButton />;
  }

  if (!auth.account) {
    // Signed in, but the account has not arrived. Hold the avatar's footprint so
    // the navbar does not reflow when it does, and mark it busy so Argos waits
    // for the resolved state instead of screenshotting the gap.
    return (
      <InitialAvatar
        aria-busy
        initial=""
        color="var(--gray-3)"
        className="size-8 shrink-0"
      />
    );
  }

  return <UserMenu account={auth.account} />;
}
