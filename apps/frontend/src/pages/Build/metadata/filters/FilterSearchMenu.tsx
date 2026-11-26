import { Menu, MenuItem, SubMenu, SubMenuContent } from "@/ui/menu-kit";

import type { BuildJourney } from "../../BuildDiffState";
import {
  getJourneyTestMenuItems,
  useJourneyTestFiles,
  type JourneyTestFiles,
} from "../../journey-tests";
import { getFilterCategoryItems } from "./FilterCategoryMenu";
import type { FilterState } from "./FilterState";
import {
  FilterCategory,
  getFilterCategoryDefinition,
  getFilterKey,
  type FilterGroup,
} from "./util";

/**
 * The journeys as the overview lists them: by file, a row per test with its
 * runs together. The filter keeps a journey per run, so the URL stays a list
 * of short ids, and a row takes or leaves all the runs of its test: the
 * Viewport filter is there to keep one.
 */
function getJourneyFilterItems(
  state: FilterState,
  filterGroup: FilterGroup,
  testFiles: JourneyTestFiles<BuildJourney>,
) {
  const selectedKeys = state.active.intersection(filterGroup.filterKeys);
  const otherKeys = state.active.difference(filterGroup.filterKeys);
  return getJourneyTestMenuItems(testFiles, (test) => {
    const keys = new Set(
      test.journeys.map((journey) =>
        getFilterKey({ category: FilterCategory.journey, value: journey.id }),
      ),
    );
    return {
      checkbox: true,
      checked: !selectedKeys.isDisjointFrom(keys),
      onAction: () => state.setActive(otherKeys.union(keys)),
      onCheckedChange: (checked: boolean) => {
        const next = checked
          ? selectedKeys.union(keys)
          : selectedKeys.difference(keys);
        state.setActive(otherKeys.union(next));
      },
    };
  });
}

/** One category's submenu, as a function so the menu can read it. */
function getCategorySubmenu(
  state: FilterState,
  filterGroup: FilterGroup,
  testFiles: JourneyTestFiles<BuildJourney>,
) {
  const categoryDef = getFilterCategoryDefinition(filterGroup.category);
  return (
    <SubMenu key={filterGroup.category}>
      <MenuItem icon={<categoryDef.icon />}>{categoryDef.label}</MenuItem>
      <SubMenuContent>
        {filterGroup.category === FilterCategory.journey
          ? getJourneyFilterItems(state, filterGroup, testFiles)
          : getFilterCategoryItems({ state, filterGroup })}
      </SubMenuContent>
    </SubMenu>
  );
}

export function FilterSearchMenu(props: { state: FilterState }) {
  const { state } = props;
  const testFiles = useJourneyTestFiles(state.journeys);
  return (
    <Menu
      side="bottom"
      align="start"
      aria-label="Filters"
      search="Search filters…"
      noResultsPlaceholder="No results"
    >
      {state.filterGroups.map((filterGroup) =>
        getCategorySubmenu(state, filterGroup, testFiles),
      )}
    </Menu>
  );
}
