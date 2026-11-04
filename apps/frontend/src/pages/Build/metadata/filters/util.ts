import { useCallback, useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { createSerializer, parseAsString, useQueryState } from "nuqs";

import { parseAsSetOf } from "@/util/search-params";

import type { BuildJourney, Diff } from "../../BuildDiffState";
import { getJourneyRunHints } from "../../journey-hints";
import { getBrowserLabel } from "../browser/browserLabels";
import {
  getMetadataCategoryDefinition,
  isKnownMetadataCategory,
  MetadataCategory,
} from "../metadataCategories";
import { isRelevantStoryTag } from "../tags/util";
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

/**
 * The journeys the review walks, by journey id. Kept in the URL rather than
 * with the other filters: a link to a journey opens the build on it, and
 * leaving for the build overview drops it.
 */
const journeySearchParams = {
  journey: parseAsSetOf(parseAsString).withDefault(new Set()),
};

export const serializeJourneySearch = createSerializer(journeySearchParams);

export function useJourneySearchState() {
  return useQueryState("journey", journeySearchParams.journey);
}

function parseFilterKey(key: string) {
  const [category = "", ...rest] = key.split(":");
  return { category, value: rest.join(":") };
}

export function getStoryKindFromStoryId(storyId: string | null | undefined) {
  return (storyId || "").split("--")[0] || null;
}

function getFilters(
  diffs: Diff[],
  journeys: BuildJourney[],
): {
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
  }

  const runHints = getJourneyRunHints(journeys);
  for (const { id, title, steps } of journeys) {
    const hint = runHints.get(id);
    const label = [
      title,
      hint?.browser ? getBrowserLabel(hint.browser) : null,
      hint?.viewport ? formatViewport(hint.viewport) : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const filter = createFilter({
      category: MetadataCategory.journey,
      value: id,
      label,
    });
    filterByKey.set(filter.key, {
      ...filter,
      count: steps.reduce((count, step) => count + step.diffs.length, 0),
    });
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
 * Create a filter state from diffs, and the journeys of the build.
 */
export function useCreateFilterState(
  diffs: Diff[],
  journeys: BuildJourney[],
): FilterState {
  const [localActive, setLocalActive] = useState<Set<string>>(new Set());
  const [journeyIds, setJourneyIds] = useJourneySearchState();
  const { filterByKey, filterGroups, filters } = useMemo(
    () => getFilters(diffs, journeys),
    [diffs, journeys],
  );
  // A journey id the build does not have, from an old link, filters nothing.
  const active = useMemo(() => {
    const active = new Set(localActive);
    for (const journeyId of journeyIds) {
      const key = getFilterKey({
        category: MetadataCategory.journey,
        value: journeyId,
      });
      if (filterByKey.has(key)) {
        active.add(key);
      }
    }
    return active;
  }, [localActive, journeyIds, filterByKey]);
  const setActive: FilterState["setActive"] = useCallback(
    (next) => {
      const nextLocal = new Set<string>();
      const nextJourneyIds = new Set<string>();
      for (const key of next) {
        const { category, value } = parseFilterKey(key);
        if (category === MetadataCategory.journey) {
          nextJourneyIds.add(value);
        } else {
          nextLocal.add(key);
        }
      }
      setLocalActive(nextLocal);
      void setJourneyIds(nextJourneyIds.size > 0 ? nextJourneyIds : null);
    },
    [setJourneyIds],
  );
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
      journeys,
    }),
    [active, setActive, filterGroups, getFilterByKey, filters, journeys],
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
      group.category === FilterCategory.journey ||
      group.filterKeys.size > 1,
  );
}

export function diffMatchesFilters(
  diff: Diff,
  activeFilters: Set<string>,
  context: {
    /** The screenshots of each journey, by journey id. */
    journeyDiffIds: Map<string, Set<string>>;
  },
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

        case MetadataCategory.journey: {
          if (context.journeyDiffIds.get(value)?.has(diff.id)) {
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
