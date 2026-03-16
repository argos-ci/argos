import {
  GlobeIcon,
  LaptopIcon,
  MoonIcon,
  PrinterIcon,
  SmartphoneIcon,
  SunIcon,
  TabletIcon,
} from "lucide-react";

export const categoryIcons = {
  Browser: GlobeIcon,
  Viewport: LaptopIcon,
  "Color scheme": SunIcon,
  "Media type": PrinterIcon,
} as const;

export type MetadataCategory = keyof typeof categoryIcons;

export function isKnownMetadataCategory(
  category: string,
): category is MetadataCategory {
  return category in categoryIcons;
}

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
): keyof typeof colorSchemeIcons {
  return colorScheme === "dark" ? "dark" : "light";
}

export const mediaTypeIcons = {
  print: PrinterIcon,
} as const;

export function getMediaTypeIconKind(
  mediaType: string,
): keyof typeof mediaTypeIcons | null {
  return mediaType === "print" ? "print" : null;
}
