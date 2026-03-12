import { createContext, use } from "react";
import { invariant } from "@argos/util/invariant";

import type { Diff } from "../BuildDiffState";

export type MetadataTag = {
  category: string;
  value: string;
  label: string;
  count: number;
};

export type MetadataFilterContextValue = {
  tags: MetadataTag[];
  selectedFilters: string[];
  setSelectedFilters: (filters: string[]) => void;
};

export const MetadataFilterContext =
  createContext<MetadataFilterContextValue | null>(null);

export function useMetadataFilterState() {
  const context = use(MetadataFilterContext);
  invariant(
    context,
    "useMetadataFilterState must be used within a BuildDiffProvider",
  );
  return context;
}

function getFilterKey(category: string, value: string) {
  return `${category}:${value}`;
}

function getMetadataForDiff(diff: Diff) {
  return diff.compareScreenshot?.metadata ?? diff.baseScreenshot?.metadata;
}

export function extractMetadataTags(diffs: Diff[]): MetadataTag[] {
  const counts = new Map<
    string,
    { category: string; value: string; label: string; count: number }
  >();

  for (const diff of diffs) {
    const metadata = getMetadataForDiff(diff);
    if (!metadata) {
      continue;
    }

    const entries: { category: string; value: string; label: string }[] = [];

    if (metadata.browser) {
      entries.push({
        category: "Browser",
        value: metadata.browser.name,
        label: metadata.browser.name,
      });
    }

    if (metadata.viewport) {
      const vp = `${metadata.viewport.width}×${metadata.viewport.height}`;
      entries.push({ category: "Viewport", value: vp, label: vp });
    }

    if (metadata.colorScheme) {
      entries.push({
        category: "Color scheme",
        value: metadata.colorScheme,
        label: metadata.colorScheme,
      });
    }

    if (metadata.mediaType) {
      entries.push({
        category: "Media type",
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
      return a.category.localeCompare(b.category);
    }

    if (a.category === "Viewport" && b.category === "Viewport") {
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

  // Group filters by category
  const byCategory = new Map<string, string[]>();
  for (const filter of selectedFilters) {
    const [category, ...rest] = filter.split(":");
    const value = rest.join(":");
    if (!category) {
      continue;
    }
    const existing = byCategory.get(category) ?? [];
    existing.push(value);
    byCategory.set(category, existing);
  }

  // All categories must match (AND), within a category any value matches (OR)
  for (const entry of Array.from(byCategory.entries())) {
    const [category, values] = entry;
    let matched = false;
    for (const value of values) {
      switch (category) {
        case "Browser":
          if (metadata.browser?.name === value) {
            matched = true;
          }
          break;

        case "Viewport":
          if (metadata.viewport) {
            const vp = `${metadata.viewport.width}×${metadata.viewport.height}`;
            if (vp === value) {
              matched = true;
            }
          }
          break;

        case "Color scheme":
          if (metadata.colorScheme === value) {
            matched = true;
          }
          break;

        case "Media type":
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
