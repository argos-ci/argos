import {
  BookMarkedIcon,
  GlobeIcon,
  LaptopIcon,
  PrinterIcon,
  SunMoonIcon,
  TagIcon,
} from "lucide-react";

export const MetadataCategory = {
  browser: "browser",
  viewport: "viewport",
  colorScheme: "colorScheme",
  mediaType: "mediaType",
  storyKind: "storyKind",
  storyTag: "storyTag",
  snapshotTag: "snapshotTag",
  testTag: "testTag",
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
    icon: SunMoonIcon,
  },
  [MetadataCategory.mediaType]: {
    label: "Media type",
    pluralLabel: "media types",
    icon: PrinterIcon,
  },
  [MetadataCategory.storyKind]: {
    label: "Story",
    pluralLabel: "Stories",
    icon: BookMarkedIcon,
  },
  [MetadataCategory.storyTag]: {
    label: "Story tag",
    pluralLabel: "story tags",
    icon: TagIcon,
  },
  [MetadataCategory.snapshotTag]: {
    label: "Snapshot tag",
    pluralLabel: "snapshot tags",
    icon: TagIcon,
  },
  [MetadataCategory.testTag]: {
    label: "Test tag",
    pluralLabel: "test tags",
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
