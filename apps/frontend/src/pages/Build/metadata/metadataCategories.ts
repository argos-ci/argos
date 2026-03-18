import {
  GlobeIcon,
  LaptopIcon,
  PrinterIcon,
  SunIcon,
  TagIcon,
} from "lucide-react";

export const MetadataCategory = {
  browser: "browser",
  viewport: "viewport",
  colorScheme: "colorScheme",
  mediaType: "mediaType",
  tag: "tag",
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
  [MetadataCategory.tag]: {
    label: "Tag",
    pluralLabel: "tags",
    icon: TagIcon,
  },
} as const;

export function getMetadataCategoryDefinition(category: MetadataCategory) {
  return metadataCategoryDefinitions[category];
}

export function isKnownMetadataCategory(
  category: string,
): category is MetadataCategory {
  return Object.values(MetadataCategory).includes(category as MetadataCategory);
}
