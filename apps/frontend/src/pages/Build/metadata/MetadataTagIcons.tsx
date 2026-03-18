import clsx from "clsx";

import { BrowserIcon } from "./browser/BrowserIcon";
import { parseViewport } from "./filters/metadataFilterUtils";
import {
  getMetadataCategoryDefinition,
  MetadataCategory,
} from "./metadataCategories";
import {
  colorSchemeIcons,
  getViewportIconKind,
  isColorScheme,
  isMediaType,
  mediaTypeIcons,
  viewportIcons,
} from "./metadataIcons";

export const CategoryIcon = (props: { category: MetadataCategory }) => {
  const Icon = getMetadataCategoryDefinition(props.category).icon;
  return <Icon className="size-3" />;
};

export const TagValueIcon = (props: {
  category: MetadataCategory;
  value: string;
  className?: string;
}) => {
  const iconSizeClass = "shrink-0";

  switch (props.category) {
    case MetadataCategory.browser:
      return (
        <BrowserIcon
          browser={{ name: props.value }}
          className={clsx(iconSizeClass, props.className)}
        />
      );

    case MetadataCategory.viewport: {
      const { width } = parseViewport(props.value);
      const kind = getViewportIconKind(width);
      const Icon = viewportIcons[kind];
      return <Icon className={clsx(iconSizeClass, props.className)} />;
    }

    case MetadataCategory.colorScheme: {
      if (!isColorScheme(props.value)) {
        return null;
      }
      const Icon = colorSchemeIcons[props.value];
      return <Icon className={clsx(iconSizeClass, props.className)} />;
    }

    case MetadataCategory.mediaType: {
      if (!isMediaType(props.value)) {
        return null;
      }
      const Icon = mediaTypeIcons[props.value];
      return <Icon className={clsx(iconSizeClass, props.className)} />;
    }

    case MetadataCategory.snapshotTag:
    case MetadataCategory.testTag:
      return null;

    default:
      return null;
  }
};
