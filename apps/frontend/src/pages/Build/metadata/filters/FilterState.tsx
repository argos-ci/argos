import { createContext } from "react";

import type { Filter, FilterGroup } from "./util";

export type FilterState = {
  filters: Filter[];
  filterGroups: FilterGroup[];
  getFilterByKey: (key: string) => Filter;
  active: Set<string>;
  setActive: (active: Set<string>) => void;
};

export const FilterStateContext = createContext<FilterState | null>(null);
