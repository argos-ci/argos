import { createContext } from "react";

import type { BuildJourney } from "../../BuildDiffState";
import type { Filter, FilterGroup } from "./util";

export type FilterState = {
  filters: Filter[];
  /** The build's journeys, which the journey filters are made of. */
  journeys: BuildJourney[];
  filterGroups: FilterGroup[];
  getFilterByKey: (key: string) => Filter;
  active: Set<string>;
  setActive: (active: Set<string>) => void;
};

export const FilterStateContext = createContext<FilterState | null>(null);
