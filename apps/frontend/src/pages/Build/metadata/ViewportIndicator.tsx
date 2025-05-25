import { clsx } from "clsx";
import { LaptopIcon, SmartphoneIcon, TabletIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { Chip, ChipLink, ChipLinkProps, ChipProps } from "@/ui/Chip";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Tooltip } from "@/ui/Tooltip";

type Viewport = {
  width: number;
  height: number;
};

type ViewportIndicatorOptions = {
  viewport: Viewport;
};

function getViewportIcon(viewport: Viewport) {
  if (viewport.width >= 1025) {
    return LaptopIcon;
  }
  if (viewport.width >= 641) {
    return TabletIcon;
  }
  return SmartphoneIcon;
}

function useViewportIndicator<
  T extends ViewportIndicatorOptions & {
    className?: string;
  },
>(props: T) {
  const { viewport, className, ...rest } = props;
  return {
    chipProps: {
      icon: getViewportIcon(viewport),
      scale: "xs",
      className: clsx("font-mono", className),
      children: viewport.width,
      ...rest,
    },
    tooltipProps: {
      content: `Viewport size of ${viewport.width}x${viewport.height}px`,
    },
  };
}

export function ViewportIndicator(props: ChipProps & ViewportIndicatorOptions) {
  const { chipProps, tooltipProps } = useViewportIndicator(props);
  return (
    <Tooltip {...tooltipProps}>
      <Chip {...chipProps} />
    </Tooltip>
  );
}

export function ViewportIndicatorLink(
  props: ChipLinkProps &
    ViewportIndicatorOptions & { href: string; shortcutEnabled: boolean },
) {
  const { chipProps, tooltipProps } = useViewportIndicator(props);
  const navigate = useNavigate();
  const hotkey = useBuildHotkey("switchViewport", () => navigate(props.href), {
    enabled: props.shortcutEnabled,
  });

  const chipLink = <ChipLink {...chipProps} />;

  if (!props.shortcutEnabled) {
    return <Tooltip {...tooltipProps}>{chipLink}</Tooltip>;
  }

  return (
    <HotkeyTooltip keys={hotkey.displayKeys} description={tooltipProps.content}>
      {chipLink}
    </HotkeyTooltip>
  );
}
