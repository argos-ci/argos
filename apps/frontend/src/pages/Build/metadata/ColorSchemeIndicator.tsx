import { assertNever } from "@argos/util/assertNever";
import { clsx } from "clsx";

import { ScreenshotMetadataColorScheme } from "@/gql/graphql";
import { Chip, ChipLink, ChipLinkProps, ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { colorSchemeIcons, getColorSchemeIconKind } from "./metadataIcons";

type ColorSchemeIndicatorOptions = {
  colorScheme: ScreenshotMetadataColorScheme;
};

function getColorSchemeLabel(colorScheme: ScreenshotMetadataColorScheme) {
  switch (colorScheme) {
    case ScreenshotMetadataColorScheme.Light:
      return "Light color scheme";
    case ScreenshotMetadataColorScheme.Dark:
      return "Dark color scheme";
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
  const icon = colorSchemeIcons[getColorSchemeIconKind(colorScheme)];
  const label = getColorSchemeLabel(colorScheme);
  return {
    chipProps: {
      icon,
      scale: "xs",
      className: clsx("font-mono cursor-default", className),
      children: null,
      ...rest,
    },
    tooltipProps: {
      content: label,
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
