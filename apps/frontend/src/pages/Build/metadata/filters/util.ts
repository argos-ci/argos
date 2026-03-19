import type { Selection } from "react-aria-components";

import type { Diff } from "../../BuildDiffState";
import {
  getMetadataCategoryDefinition,
  isKnownMetadataCategory,
  MetadataCategory,
} from "../metadataCategories";
import { formatViewport, parseViewport } from "../viewports/util";

export const FilterCategory = MetadataCategory;
export type FilterCategory = MetadataCategory;

export { getMetadataCategoryDefinition as getFilterCategoryDefinition };

export type Filter = {
  key: string;
  category: FilterCategory;
  value: string;
  label: string;
  count: number;
};

export function groupFiltersByCategory(filters: Filter[]) {
  const byCategory = new Map<FilterCategory, Filter[]>();
  for (const filter of filters) {
    const list = byCategory.get(filter.category) ?? [];
    list.push(filter);
    byCategory.set(filter.category, list);
  }
  return byCategory;
}

export function resolveSelectionKeys(
  selection: Selection,
  allKeys: string[],
): string[] {
  return selection === "all" ? allKeys : Array.from(selection, String);
}

export function setCategoryFilters(
  category: MetadataCategory,
  nextKeys: string[],
  currentKeys: string[],
): string[] {
  const otherFilters = currentKeys.filter(
    (key) => !checkIsCategoryFilterKey(key, category),
  );
  return [...otherFilters, ...nextKeys];
}

function createFilter<T extends Pick<Filter, "category" | "value">>(
  args: T,
): T & { key: string } {
  return { ...args, key: getFilterKey(args) };
}

function getFilterKey(filter: Pick<Filter, "category" | "value">): string {
  return `${filter.category}:${filter.value}`;
}

export function checkIsCategoryFilterKey(
  key: string,
  category: FilterCategory,
) {
  return key.startsWith(`${category}:`);
}

function getMetadataForDiff(diff: Diff) {
  return diff.compareScreenshot?.metadata ?? diff.baseScreenshot?.metadata;
}

export function extractFilters(diffs: Diff[]): Filter[] {
  const counts = new Map<string, Filter>();

  for (const diff of diffs) {
    const metadata = getMetadataForDiff(diff);
    if (!metadata) {
      continue;
    }

    const entries: Omit<Filter, "count">[] = [];

    if (metadata.browser) {
      entries.push(
        createFilter({
          category: MetadataCategory.browser,
          value: metadata.browser.name,
          label: metadata.browser.name,
        }),
      );
    }

    if (metadata.viewport) {
      const vp = formatViewport(metadata.viewport);
      entries.push(
        createFilter({
          category: MetadataCategory.viewport,
          value: vp,
          label: vp,
        }),
      );
    }

    if (metadata.colorScheme) {
      entries.push(
        createFilter({
          category: MetadataCategory.colorScheme,
          value: metadata.colorScheme,
          label: metadata.colorScheme,
        }),
      );
    }

    if (metadata.mediaType) {
      entries.push(
        createFilter({
          category: MetadataCategory.mediaType,
          value: metadata.mediaType,
          label: metadata.mediaType,
        }),
      );
    }

    if (metadata.tags) {
      for (const tag of metadata.tags) {
        entries.push(
          createFilter({
            category: MetadataCategory.snapshotTag,
            value: tag,
            label: tag,
          }),
        );
      }
    }

    if (metadata.test?.tags) {
      for (const tag of metadata.test.tags) {
        entries.push(
          createFilter({
            category: MetadataCategory.testTag,
            value: tag,
            label: tag,
          }),
        );
      }
    }

    for (const entry of entries) {
      const key = getFilterKey(entry);
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
      } else {
        counts.set(key, { ...entry, count: 1 });
      }
    }
  }

  return Array.from(counts.values()).sort((a, b) => {
    if (a.category !== b.category) {
      const aLabel = getMetadataCategoryDefinition(a.category).label;
      const bLabel = getMetadataCategoryDefinition(b.category).label;
      return aLabel.localeCompare(bLabel);
    }

    if (
      a.category === MetadataCategory.viewport &&
      b.category === MetadataCategory.viewport
    ) {
      const aViewport = parseViewport(a.value);
      const bViewport = parseViewport(b.value);

      if (aViewport.width !== bViewport.width) {
        return aViewport.width - bViewport.width;
      }

      if (aViewport.height !== bViewport.height) {
        return aViewport.height - bViewport.height;
      }
    }

    return a.label.localeCompare(b.label);
  });
}

export function diffMatchesFilters(
  diff: Diff,
  selectedFilters: string[],
): boolean {
  const metadata = getMetadataForDiff(diff);
  if (!metadata) {
    return false;
  }

  // All categories must match (AND), within a category any value matches (OR).
  const byCategory = new Map<MetadataCategory, string[]>();
  for (const filter of selectedFilters) {
    const [category, ...rest] = filter.split(":");
    const value = rest.join(":");
    if (!category) {
      continue;
    }
    if (!isKnownMetadataCategory(category)) {
      return false;
    }
    const existing = byCategory.get(category) ?? [];
    existing.push(value);
    byCategory.set(category, existing);
  }

  for (const [category, values] of Array.from(byCategory.entries())) {
    let matched = false;
    for (const value of values) {
      switch (category) {
        case MetadataCategory.browser:
          if (metadata.browser?.name === value) {
            matched = true;
          }
          break;

        case MetadataCategory.viewport:
          if (metadata.viewport) {
            const vp = formatViewport(metadata.viewport);
            if (vp === value) {
              matched = true;
            }
          }
          break;

        case MetadataCategory.colorScheme:
          if (metadata.colorScheme === value) {
            matched = true;
          }
          break;

        case MetadataCategory.mediaType:
          if (metadata.mediaType === value) {
            matched = true;
          }
          break;

        case MetadataCategory.snapshotTag: {
          if (metadata.tags?.includes(value)) {
            matched = true;
          }
          break;
        }

        case MetadataCategory.testTag: {
          if (metadata.test?.tags?.includes(value)) {
            matched = true;
          }
          break;
        }
      }
    }

    if (!matched) {
      return false;
    }
  }

  return true;
}
