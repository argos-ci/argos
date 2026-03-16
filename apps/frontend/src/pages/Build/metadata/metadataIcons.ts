import {
  GlobeIcon,
  LaptopIcon,
  MoonIcon,
  PrinterIcon,
  SmartphoneIcon,
  SunIcon,
  TabletIcon,
} from "lucide-react";

export const MetadataCategory = {
  browser: "browser",
  viewport: "viewport",
  colorScheme: "colorScheme",
  mediaType: "mediaType",
} as const;

export type MetadataCategory =
  (typeof MetadataCategory)[keyof typeof MetadataCategory];

const metadataCategoryDefinitions = {
  [MetadataCategory.browser]: {
    label: "Browser",
    pluralLabel: "browsers",
    icon: GlobeIcon,
  },
  [MetadataCategory.viewport]: {
    label: "Viewport",
    pluralLabel: "viewports",
    icon: LaptopIcon,
  },
  [MetadataCategory.colorScheme]: {
    label: "Color scheme",
    pluralLabel: "color schemes",
    icon: SunIcon,
  },
  [MetadataCategory.mediaType]: {
    label: "Media type",
    pluralLabel: "media types",
    icon: PrinterIcon,
  },
} as const;

export function getMetadataCategoryDefinition(category: MetadataCategory) {
  return metadataCategoryDefinitions[category];
}

export function isKnownMetadataCategory(
  category: string,
): category is MetadataCategory {
  return category in metadataCategoryDefinitions;
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
