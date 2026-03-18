import clsx from "clsx";

import { BrowserIcon } from "../browser/BrowserIcon";
import {
  colorSchemeIcons,
  getViewportIconKind,
  isColorScheme,
  isMediaType,
  mediaTypeIcons,
  viewportIcons,
} from "../metadataIcons";
import { parseViewport } from "../viewports/util";
import { FilterCategory, type Filter } from "./util";

export const FilterIcon = (props: { filter: Filter; className?: string }) => {
  const { filter, className } = props;
  const iconClassName = clsx("shrink-0", className);

  switch (filter.category) {
    case FilterCategory.browser:
      return (
        <BrowserIcon
          browser={{ name: filter.value }}
          className={iconClassName}
        />
      );

    case FilterCategory.viewport: {
      const { width } = parseViewport(filter.value);
      const kind = getViewportIconKind(width);
      const Icon = viewportIcons[kind];
      return <Icon className={iconClassName} />;
    }

    case FilterCategory.colorScheme: {
      if (!isColorScheme(filter.value)) {
        return null;
      }
      const Icon = colorSchemeIcons[filter.value];
      return <Icon className={iconClassName} />;
    }

    case FilterCategory.mediaType: {
      if (!isMediaType(filter.value)) {
        return null;
      }
      const Icon = mediaTypeIcons[filter.value];
      return <Icon className={iconClassName} />;
    }

    case FilterCategory.tag:
      return null;

    default:
      return null;
  }
};
