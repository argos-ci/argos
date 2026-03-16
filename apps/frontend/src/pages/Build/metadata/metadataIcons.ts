import {
  LaptopIcon,
  MoonIcon,
  PrinterIcon,
  SmartphoneIcon,
  SunIcon,
  TabletIcon,
} from "lucide-react";

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

export function parseViewportWidth(value: string) {
  return Number(value.split("×")[0]) || 0;
}

export const colorSchemeIcons = {
  dark: MoonIcon,
  light: SunIcon,
} as const;

export function getColorSchemeIconKind(
  colorScheme: string,
): keyof typeof colorSchemeIcons | null {
  switch (colorScheme) {
    case "dark":
      return "dark";

    case "light":
      return "light";

    default:
      return null;
  }
}

export const mediaTypeIcons = {
  print: PrinterIcon,
} as const;

export function getMediaTypeIconKind(
  mediaType: string,
): keyof typeof mediaTypeIcons | null {
  switch (mediaType) {
    case "print":
      return "print";

    default:
      return null;
  }
}
