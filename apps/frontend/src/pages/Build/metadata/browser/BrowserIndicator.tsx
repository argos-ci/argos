import { lazy, Suspense } from "react";
import { GlobeIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { ChipLink, ChipLinkProps } from "@/ui/Chip";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Tooltip } from "@/ui/Tooltip";

const LazyBrowserIcon = lazy(() =>
  import("./BrowserIcon").then((mod) => ({ default: mod.BrowserIcon })),
);

function BrowserIcon(props: {
  browser: BrowserIndicatorOptions["browser"];
  className?: string;
}) {
  const { browser, ...rest } = props;
  return (
    <Suspense fallback={<GlobeIcon {...rest} />}>
      <LazyBrowserIcon browser={browser} {...rest} />
    </Suspense>
  );
}

type BrowserIndicatorOptions = {
  browser: {
    name: string;
    version: string;
  };
};

const Labels: Record<string, string> = {
  edge: "Edge",
  firefox: "Firefox",
  safari: "Safari",
  chrome: "Chrome",
  chromium: "Chromium",
  electron: "Electron",
};

function useBrowserIndicator<
  T extends BrowserIndicatorOptions & {
    className?: string;
  },
>(props: T) {
  const { browser, className, ...rest } = props;
  return {
    iconProps: { className },
    tooltipProps: {
      content: `${browser.name} v${browser.version}`,
    },
    chipProps: {
      className,
      children: Labels[browser.name] ?? browser.name,
      ...rest,
    },
  };
}

export function BrowserIndicator(
  props: {
    className?: string;
  } & BrowserIndicatorOptions,
) {
  const { tooltipProps, iconProps } = useBrowserIndicator(props);
  return (
    <Tooltip {...tooltipProps}>
      <BrowserIcon browser={props.browser} {...iconProps} />
    </Tooltip>
  );
}

export function BrowserIndicatorLink(
  props: Omit<ChipLinkProps, "icon"> &
    BrowserIndicatorOptions & {
      shortcutEnabled: boolean;
      href: string;
    },
) {
  const { tooltipProps, iconProps, chipProps } = useBrowserIndicator(props);
  const navigate = useNavigate();
  const hotkey = useBuildHotkey("switchBrowser", () => navigate(props.href), {
    enabled: props.shortcutEnabled,
  });

  const chipLink = (
    <ChipLink
      {...chipProps}
      className="shrink-0"
      scale="xs"
      icon={<BrowserIcon browser={props.browser} {...iconProps} />}
    />
  );

  if (!props.shortcutEnabled) {
    return <Tooltip {...tooltipProps}>{chipLink}</Tooltip>;
  }

  return (
    <HotkeyTooltip keys={hotkey.displayKeys} description={tooltipProps.content}>
      {chipLink}
    </HotkeyTooltip>
  );
}
