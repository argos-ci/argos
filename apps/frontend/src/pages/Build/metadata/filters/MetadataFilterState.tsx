import { createContext, use } from "react";
import { invariant } from "@argos/util/invariant";

import type { MetadataTag } from "./metadataFilterUtils";

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
