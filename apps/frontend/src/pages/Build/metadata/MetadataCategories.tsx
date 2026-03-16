import { BrowserIcon } from "./browser/BrowserIcon";
import {
  categoryIcons,
  colorSchemeIcons,
  getColorSchemeIconKind,
  getMediaTypeIconKind,
  getViewportIconKind,
  mediaTypeIcons,
  parseViewportWidth,
  viewportIcons,
  type MetadataCategory,
} from "./metadataIcons";

export const categoryPluralLabels: Record<MetadataCategory, string> = {
  Browser: "browsers",
  Viewport: "viewports",
  "Color scheme": "color schemes",
  "Media type": "media types",
};

export const CategoryIcon = (props: { category: MetadataCategory }) => {
  const Icon = categoryIcons[props.category];
  return <Icon className="size-3" />;
};

export const TagValueIcon = (props: {
  category: MetadataCategory;
  value: string;
}) => {
  const iconSizeClass = "size-3 shrink-0";

  switch (props.category) {
    case "Browser":
      return (
        <BrowserIcon
          browser={{ name: props.value }}
          className={iconSizeClass}
        />
      );

    case "Viewport": {
      const width = parseViewportWidth(props.value);
      const kind = getViewportIconKind(width);
      const Icon = viewportIcons[kind];
      return <Icon className={iconSizeClass} />;
    }

    case "Color scheme": {
      const kind = getColorSchemeIconKind(props.value);
      const Icon = colorSchemeIcons[kind];
      return <Icon className={iconSizeClass} />;
    }

    case "Media type": {
      const kind = getMediaTypeIconKind(props.value);
      if (!kind) {
        return null;
      }
      const Icon = mediaTypeIcons[kind];
      return <Icon className={iconSizeClass} />;
    }

    default:
      return null;
  }
};
