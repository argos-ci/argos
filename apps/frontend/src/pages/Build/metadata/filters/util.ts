import { useCallback, useMemo } from "react";
import { resolveTestIdentity } from "@argos/schemas/journey";
import { invariant } from "@argos/util/invariant";
import { createSerializer, parseAsString, useQueryState } from "nuqs";

import { parseAsSetOf } from "@/util/search-params";

import type { Diff } from "../../BuildDiffState";
import {
  getMetadataCategoryDefinition,
  isKnownMetadataCategory,
  MetadataCategory,
} from "../metadataCategories";
import { isRelevantStoryTag } from "../tags/util";
import type { VariantAxis } from "../variants/sibling";
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

export function getFilterKey(
  filter: Pick<Filter, "category" | "value">,
): string {
  return `${filter.category}:${filter.value}`;
}

function parseFilterKey(key: string) {
  const [category = "", ...rest] = key.split(":");
  return { category, value: rest.join(":") };
}

/**
 * The active filters live in the URL: a link opens the build filtered, which
 * is what the runs of the build overview are, and a reload keeps them.
 */
const filterSearchParams = {
  filters: parseAsSetOf(parseAsString).withDefault(new Set()),
};

const serializeFilterSearch = createSerializer(filterSearchParams);

/** `url` with `filters` active. */
export function withFilters(url: string, filters: ReadonlySet<string>): string {
  return serializeFilterSearch(url, {
    filters: filters.size > 0 ? new Set(filters) : null,
  });
}

/**
 * The test a screenshot comes from, as the Test filter names it. Stories have
 * the Story kind filter.
 */
function getFilterTestKey(
  metadata: NonNullable<Diff["compareScreenshot"]>["metadata"],
) {
  return metadata?.story?.id
    ? null
    : (resolveTestIdentity(metadata)?.key ?? null);
}

export function getStoryKindFromStoryId(storyId: string | null | undefined) {
  return (storyId || "").split("--")[0] || null;
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

    const storyKind = getStoryKindFromStoryId(metadata.story?.id);
    if (storyKind) {
      addFilter({
        category: MetadataCategory.storyKind,
        value: storyKind,
        label: storyKind,
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

    if (metadata.story?.tags) {
      for (const tag of metadata.story.tags) {
        if (!isRelevantStoryTag(tag)) {
          continue;
        }
        addFilter({
          category: MetadataCategory.storyTag,
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

    const testKey = getFilterTestKey(metadata);
    if (testKey) {
      addFilter({
        category: MetadataCategory.test,
        value: testKey,
        label: testKey,
      });
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
  const [filtersParam, setFiltersParam] = useQueryState(
    "filters",
    filterSearchParams.filters,
  );
  // A category this version does not know, from an old link, filters nothing.
  const active = useMemo(
    () =>
      new Set(
        Array.from(filtersParam).filter((key) =>
          isKnownMetadataCategory(parseFilterKey(key).category),
        ),
      ),
    [filtersParam],
  );
  const setActive = useCallback(
    (next: Set<string>) => {
      void setFiltersParam(next.size > 0 ? next : null);
    },
    [setFiltersParam],
  );
  const { filterByKey, filterGroups, filters } = useMemo(
    () => getFiltersFromDiffs(diffs),
    [diffs],
  );
  const getFilterByKey: FilterState["getFilterByKey"] = useCallback(
    (key) => {
      const existing = filterByKey.get(key);
      if (existing) {
        return existing;
      }
      // A link can filter on screenshots the list has not loaded yet.
      const { category, value } = parseFilterKey(key);
      invariant(isKnownMetadataCategory(category), "Filter not found");
      return { key, category, value, label: value, count: 0 };
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
    [active, setActive, filterGroups, getFilterByKey, filters],
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
      // These categories are shown in filters even if there is only one because they act as a discriminator.
      // It means a portion of the tests may not be on this category.
      group.category === FilterCategory.storyKind ||
      group.category === FilterCategory.storyTag ||
      group.category === FilterCategory.snapshotTag ||
      group.category === FilterCategory.testTag ||
      group.category === FilterCategory.test ||
      group.filterKeys.size > 1,
  );
}

const VARIANT_FILTER_CATEGORIES: Record<VariantAxis, FilterCategory | null> = {
  browser: FilterCategory.browser,
  viewport: FilterCategory.viewport,
  colorScheme: FilterCategory.colorScheme,
  storyMode: null,
};

/**
 * `filters` once the review switches to `sibling` along `axis`: a filter on
 * that axis takes the sibling's value, so the sibling stays in the list.
 */
export function followVariantFilter(
  filters: ReadonlySet<string>,
  sibling: Diff,
  axis: VariantAxis,
): ReadonlySet<string> {
  const category = VARIANT_FILTER_CATEGORIES[axis];
  const metadata = getMetadataForDiff(sibling);
  const value =
    category === FilterCategory.browser
      ? metadata?.browser?.name
      : category === FilterCategory.viewport && metadata?.viewport
        ? formatViewport(metadata.viewport)
        : category === FilterCategory.colorScheme
          ? metadata?.colorScheme
          : null;
  if (!category || !value) {
    return filters;
  }
  const key = getFilterKey({ category, value });
  const others = Array.from(filters).filter(
    (filter) => parseFilterKey(filter).category !== category,
  );
  return filters.has(key) || others.length === filters.size
    ? filters
    : new Set([...others, key]);
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
    const { category, value } = parseFilterKey(filter);
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

        case MetadataCategory.storyKind: {
          const storyKind = getStoryKindFromStoryId(metadata.story?.id);
          if (storyKind === value) {
            matched = true;
          }
          break;
        }

        case MetadataCategory.snapshotTag: {
          if (metadata.tags?.includes(value)) {
            matched = true;
          }
          break;
        }

        case MetadataCategory.storyTag: {
          if (metadata.story?.tags?.includes(value)) {
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

        case MetadataCategory.test: {
          if (getFilterTestKey(metadata) === value) {
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
