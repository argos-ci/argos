import clsx from "clsx";

import { BrowserIcon } from "./browser/BrowserIcon";
import {
  getMetadataCategoryDefinition,
  MetadataCategory,
} from "./metadataCategories";
import {
  colorSchemeIcons,
  getColorSchemeIconKind,
  getMediaTypeIconKind,
  getViewportIconKind,
  mediaTypeIcons,
  parseViewportWidth,
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
      const width = parseViewportWidth(props.value);
      const kind = getViewportIconKind(width);
      const Icon = viewportIcons[kind];
      return <Icon className={clsx(iconSizeClass, props.className)} />;
    }

    case MetadataCategory.colorScheme: {
      const kind = getColorSchemeIconKind(props.value);
      if (!kind) {
        return null;
      }
      const Icon = colorSchemeIcons[kind];
      return <Icon className={clsx(iconSizeClass, props.className)} />;
    }

    case MetadataCategory.mediaType: {
      const kind = getMediaTypeIconKind(props.value);
      if (!kind) {
        return null;
      }
      const Icon = mediaTypeIcons[kind];
      return <Icon className={clsx(iconSizeClass, props.className)} />;
    }

    default:
      return null;
  }
};
