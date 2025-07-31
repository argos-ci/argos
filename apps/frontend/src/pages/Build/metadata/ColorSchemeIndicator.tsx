import { assertNever } from "@argos/util/assertNever";
import { clsx } from "clsx";
import { MoonIcon, SunIcon } from "lucide-react";

import { ScreenshotMetadataColorScheme } from "@/gql/graphql";
import { Chip, ChipLink, ChipLinkProps, ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

type ColorSchemeIndicatorOptions = {
  colorScheme: ScreenshotMetadataColorScheme;
};

function getColorSchemeDetails(colorScheme: ScreenshotMetadataColorScheme) {
  switch (colorScheme) {
    case ScreenshotMetadataColorScheme.Light:
      return { icon: SunIcon, label: "Light color scheme" };
    case ScreenshotMetadataColorScheme.Dark:
      return { icon: MoonIcon, label: "Dark color scheme" };
    default:
      assertNever(colorScheme, `Unknown color scheme: ${colorScheme}`);
  }
}

function useColorSchemeIndicator<
  T extends ColorSchemeIndicatorOptions & {
    className?: string;
  },
>(props: T) {
  const { colorScheme, className, ...rest } = props;
  const details = getColorSchemeDetails(colorScheme);
  return {
    chipProps: {
      icon: details.icon,
      scale: "xs",
      className: clsx("font-mono", className),
      children: null,
      ...rest,
    },
    tooltipProps: {
      content: details.label,
    },
  };
}

export function ColorSchemeIndicator(
  props: ChipProps & ColorSchemeIndicatorOptions,
) {
  const { chipProps, tooltipProps } = useColorSchemeIndicator(props);
  return (
    <Tooltip {...tooltipProps}>
      <Chip {...chipProps} />
    </Tooltip>
  );
}

export function ColorSchemeIndicatorLink(
  props: ChipLinkProps & ColorSchemeIndicatorOptions & { href: string },
) {
  const { chipProps, tooltipProps } = useColorSchemeIndicator(props);
  return (
    <Tooltip {...tooltipProps}>
      <ChipLink {...chipProps} />
    </Tooltip>
  );
}
