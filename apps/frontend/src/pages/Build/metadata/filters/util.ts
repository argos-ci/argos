import { useCallback, useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";

import type { Diff } from "../../BuildDiffState";
import {
  getMetadataCategoryDefinition,
  isKnownMetadataCategory,
  MetadataCategory,
} from "../metadataCategories";
import { formatViewport, parseViewport } from "../viewports/util";
import type { FilterState } from "./FilterState";

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

export type FilterGroup = {
  category: FilterCategory;
  filterKeys: Set<string>;
};

function createFilter<T extends Pick<Filter, "category" | "value">>(
  args: T,
): T & { key: string } {
  return { ...args, key: getFilterKey(args) };
}

function getFilterKey(filter: Pick<Filter, "category" | "value">): string {
  return `${filter.category}:${filter.value}`;
}

function getFiltersFromDiffs(diffs: Diff[]): {
  filters: Filter[];
  filterByKey: Map<string, Filter>;
  filterGroups: FilterGroup[];
} {
  const filterByKey = new Map<string, Filter>();

  for (const diff of diffs) {
    const metadata = getMetadataForDiff(diff);
    if (!metadata) {
      continue;
    }

    const addFilter = (args: Pick<Filter, "category" | "value" | "label">) => {
      const noCountFilter = createFilter(args);

      // Update the count in the filter
      const existing = filterByKey.get(noCountFilter.key);
      const filter = existing ?? { ...noCountFilter, count: 1 };
      if (existing) {
        existing.count++;
      } else {
        filterByKey.set(filter.key, filter);
      }
    };

    if (metadata.browser) {
      addFilter({
        category: MetadataCategory.browser,
        value: metadata.browser.name,
        label: metadata.browser.name,
      });
    }

    if (metadata.viewport) {
      const vp = formatViewport(metadata.viewport);
      addFilter({
        category: MetadataCategory.viewport,
        value: vp,
        label: vp,
      });
    }

    if (metadata.colorScheme) {
      addFilter({
        category: MetadataCategory.colorScheme,
        value: metadata.colorScheme,
        label: metadata.colorScheme,
      });
    }

    if (metadata.mediaType) {
      addFilter({
        category: MetadataCategory.mediaType,
        value: metadata.mediaType,
        label: metadata.mediaType,
      });
    }

    if (metadata.tags) {
      for (const tag of metadata.tags) {
        addFilter({
          category: MetadataCategory.snapshotTag,
          value: tag,
          label: tag,
        });
      }
    }

    if (metadata.test?.tags) {
      for (const tag of metadata.test.tags) {
        addFilter({
          category: MetadataCategory.testTag,
          value: tag,
          label: tag,
        });
      }
    }
  }

  const filters = Array.from(filterByKey.values()).sort((a, b) => {
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

  return { filters, filterByKey, filterGroups: getFilterGroups(filters) };
}

function getMetadataForDiff(diff: Diff) {
  return diff.compareScreenshot?.metadata ?? diff.baseScreenshot?.metadata;
}

/**
 * Create a filter state from diffs.
 */
export function useCreateFilterState(diffs: Diff[]): FilterState {
  const [active, setActive] = useState<Set<string>>(new Set());
  const { filterByKey, filterGroups, filters } = getFiltersFromDiffs(diffs);
  const getFilterByKey: FilterState["getFilterByKey"] = useCallback(
    (key) => {
      const filter = filterByKey.get(key);
      invariant(filter, "Filter not found");
      return filter;
    },
    [filterByKey],
  );
  return useMemo(
    () => ({
      active,
      setActive,
      getFilterByKey,
      filterGroups,
      filters,
    }),
    [active, setActive, filterByKey, filterGroups, getFilterByKey, filters],
  );
}

/**
 * Get the group displayed to the users.
 */
function getFilterGroups(filters: Filter[]) {
  const groupByCategory = new Map<FilterCategory, FilterGroup>();
  for (const filter of filters) {
    const group = groupByCategory.get(filter.category) ?? {
      category: filter.category,
      filterKeys: new Set(),
    };
    group.filterKeys.add(filter.key);
    groupByCategory.set(filter.category, group);
  }

  return Array.from(groupByCategory.values()).filter(
    (group) =>
      group.category === FilterCategory.snapshotTag ||
      group.category === FilterCategory.testTag ||
      group.filterKeys.size > 1,
  );
}

export function diffMatchesFilters(
  diff: Diff,
  activeFilters: Set<string>,
): boolean {
  const metadata = getMetadataForDiff(diff);
  if (!metadata) {
    return false;
  }

  // All categories must match (AND), within a category any value matches (OR).
  const byCategory = new Map<MetadataCategory, string[]>();
  for (const filter of activeFilters) {
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
