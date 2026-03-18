import { createContext } from "react";

import type { Filter } from "./util";

export type FilterState = {
  filters: Filter[];
  active: string[];
  setActive: (active: string[]) => void;
};

export const FilterStateContext = createContext<FilterState | null>(null);
