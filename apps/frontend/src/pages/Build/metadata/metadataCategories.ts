import { GlobeIcon, LaptopIcon, PrinterIcon, SunIcon } from "lucide-react";

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

export function isCustomMetadataCategory(category: string): boolean {
  return !Object.values(MetadataCategory).includes(
    category as MetadataCategory,
  );
}
