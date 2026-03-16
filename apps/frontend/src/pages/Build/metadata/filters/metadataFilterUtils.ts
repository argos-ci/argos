import type { Selection } from "react-aria-components";

import type { Diff } from "../../BuildDiffState";
import {
  getMetadataCategoryDefinition,
  isCustomMetadataCategory,
  MetadataCategory,
} from "../metadataCategories";

export type MetadataTag = {
  category: MetadataCategory;
  value: string;
  label: string;
  count: number;
};

export function groupTagsByCategory(tags: MetadataTag[]) {
  const byCategory = new Map<MetadataCategory, MetadataTag[]>();
  for (const tag of tags) {
    const list = byCategory.get(tag.category) ?? [];
    list.push(tag);
    byCategory.set(tag.category, list);
  }
  return byCategory;
}

export function getTagsForCategory(
  tags: MetadataTag[],
  category: MetadataCategory,
) {
  return tags.filter((tag) => tag.category === category);
}

export function resolveSelectionKeys(
  selection: Selection,
  allKeys: string[],
): string[] {
  return selection === "all" ? allKeys : Array.from(selection, String);
}

export function updateCategoryFilters(
  category: MetadataCategory,
  nextKeys: string[],
  currentFilters: string[],
): string[] {
  const otherFilters = currentFilters.filter(
    (f) => !f.startsWith(`${category}:`),
  );
  return [...otherFilters, ...nextKeys];
}

export function getFilterKey(category: MetadataCategory, value: string) {
  return `${category}:${value}`;
}

function getMetadataForDiff(diff: Diff) {
  return diff.compareScreenshot?.metadata ?? diff.baseScreenshot?.metadata;
}

export function extractMetadataTags(diffs: Diff[]): MetadataTag[] {
  const counts = new Map<string, MetadataTag>();

  for (const diff of diffs) {
    const metadata = getMetadataForDiff(diff);
    if (!metadata) {
      continue;
    }

    const entries: Omit<MetadataTag, "count">[] = [];

    if (metadata.browser) {
      entries.push({
        category: MetadataCategory.browser,
        value: metadata.browser.name,
        label: metadata.browser.name,
      });
    }

    if (metadata.viewport) {
      const vp = `${metadata.viewport.width}×${metadata.viewport.height}`;
      entries.push({
        category: MetadataCategory.viewport,
        value: vp,
        label: vp,
      });
    }

    if (metadata.colorScheme) {
      entries.push({
        category: MetadataCategory.colorScheme,
        value: metadata.colorScheme,
        label: metadata.colorScheme,
      });
    }

    if (metadata.mediaType) {
      entries.push({
        category: MetadataCategory.mediaType,
        value: metadata.mediaType,
        label: metadata.mediaType,
      });
    }

    for (const entry of entries) {
      const key = getFilterKey(entry.category, entry.value);
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
      const [aWidth = 0, aHeight = 0] = a.value.split("×").map(Number);
      const [bWidth = 0, bHeight = 0] = b.value.split("×").map(Number);

      if (aWidth !== bWidth) {
        return aWidth - bWidth;
      }

      if (aHeight !== bHeight) {
        return aHeight - bHeight;
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
    if (isCustomMetadataCategory(category)) {
      return false;
    }
    const knownCategory = category as MetadataCategory;
    const existing = byCategory.get(knownCategory) ?? [];
    existing.push(value);
    byCategory.set(knownCategory, existing);
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
            const vp = `${metadata.viewport.width}×${metadata.viewport.height}`;
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
      }
    }

    if (!matched) {
      return false;
    }
  }

  return true;
}
