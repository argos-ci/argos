import { SlidersHorizontalIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { Chip, ChipLink, ChipLinkProps, ChipProps } from "@/ui/Chip";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Tooltip } from "@/ui/Tooltip";

type StoryModeIndicatorOptions = {
  mode: string;
};

function useStoryModeIndicator<
  T extends StoryModeIndicatorOptions & { className?: string },
>(props: T) {
  const { mode, className, ...rest } = props;
  return {
    chipProps: {
      icon: SlidersHorizontalIcon,
      scale: "xs" as const,
      color: "storybook" as const,
      className,
      children: mode,
      ...rest,
    },
    tooltipProps: {
      content: `Story mode: ${mode}`,
    },
  };
}

export function StoryModeIndicator(
  props: ChipProps & StoryModeIndicatorOptions,
) {
  const { chipProps, tooltipProps } = useStoryModeIndicator(props);
  return (
    <Tooltip {...tooltipProps}>
      <Chip {...chipProps} />
    </Tooltip>
  );
}

export function StoryModeIndicatorLink(
  props: ChipLinkProps &
    StoryModeIndicatorOptions & { href: string; shortcutEnabled: boolean },
) {
  const { chipProps, tooltipProps } = useStoryModeIndicator(props);
  const navigate = useNavigate();
  const hotkey = useBuildHotkey("switchStoryMode", () => navigate(props.href), {
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
