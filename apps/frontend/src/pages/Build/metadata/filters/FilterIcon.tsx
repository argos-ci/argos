import { assertNever } from "@argos/util/assertNever";

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

export function FilterIcon(props: { filter: Filter; className?: string }) {
  const { filter, ...rest } = props;

  switch (filter.category) {
    case FilterCategory.browser:
      return <BrowserIcon browser={{ name: filter.value }} {...rest} />;

    case FilterCategory.viewport: {
      const { width } = parseViewport(filter.value);
      const kind = getViewportIconKind(width);
      const Icon = viewportIcons[kind];
      return <Icon {...rest} />;
    }

    case FilterCategory.colorScheme: {
      if (!isColorScheme(filter.value)) {
        return null;
      }
      const Icon = colorSchemeIcons[filter.value];
      return <Icon {...rest} />;
    }

    case FilterCategory.mediaType: {
      if (!isMediaType(filter.value)) {
        return null;
      }
      const Icon = mediaTypeIcons[filter.value];
      return <Icon {...rest} />;
    }

    case FilterCategory.testTag:
    case FilterCategory.snapshotTag:
      return null;

    default:
      assertNever(filter.category);
  }
}
