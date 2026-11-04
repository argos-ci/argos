import { Menu, MenuItem, SubMenu, SubMenuContent } from "@/ui/menu-kit";

import { useJourneyStatusContext } from "../../journey-tests";
import { getFilterCategoryItems } from "./FilterCategoryMenu";
import type { FilterState } from "./FilterState";
import { getFilterCategoryDefinition, type FilterGroup } from "./util";

/** One category's submenu, as a function so the menu can read it. */
function getCategorySubmenu(
  state: FilterState,
  filterGroup: FilterGroup,
  statusContext: ReturnType<typeof useJourneyStatusContext>,
) {
  const categoryDef = getFilterCategoryDefinition(filterGroup.category);
  return (
    <SubMenu key={filterGroup.category}>
      <MenuItem icon={<categoryDef.icon />}>{categoryDef.label}</MenuItem>
      <SubMenuContent>
        {getFilterCategoryItems({ state, filterGroup, statusContext })}
      </SubMenuContent>
    </SubMenu>
  );
}

export function FilterSearchMenu(props: { state: FilterState }) {
  const { state } = props;
  const statusContext = useJourneyStatusContext();
  return (
    <Menu
      side="bottom"
      align="start"
      aria-label="Filters"
      search="Search filters…"
      noResultsPlaceholder="No results"
    >
      {state.filterGroups.map((filterGroup) =>
        getCategorySubmenu(state, filterGroup, statusContext),
      )}
    </Menu>
  );
}
