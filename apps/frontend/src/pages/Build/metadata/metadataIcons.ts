import {
  LaptopIcon,
  MonitorIcon,
  MoonIcon,
  PrinterIcon,
  SmartphoneIcon,
  SunIcon,
  TabletIcon,
  type LucideIcon,
} from "lucide-react";

import {
  ScreenshotMetadataColorScheme,
  ScreenshotMetadataMediaType,
} from "@/gql/graphql";

export const viewportIcons = {
  desktop: LaptopIcon,
  tablet: TabletIcon,
  mobile: SmartphoneIcon,
} as const;

export function getViewportIconKind(width: number): keyof typeof viewportIcons {
  if (width >= 1025) {
    return "desktop";
  }
  if (width >= 641) {
    return "tablet";
  }
  return "mobile";
}

export const colorSchemeIcons: Record<
  ScreenshotMetadataColorScheme,
  LucideIcon
> = {
  dark: MoonIcon,
  light: SunIcon,
} as const;

export function isColorScheme(
  value: string,
): value is ScreenshotMetadataColorScheme {
  return value in colorSchemeIcons;
}

export const mediaTypeIcons: Record<ScreenshotMetadataMediaType, LucideIcon> = {
  print: PrinterIcon,
  screen: MonitorIcon,
} as const;

export function isMediaType(
  value: string,
): value is ScreenshotMetadataMediaType {
  return value in mediaTypeIcons;
}
