import { Menu, MenuItem, SubMenu, SubMenuContent } from "@/ui/menu-kit";

import { getFilterCategoryItems } from "./FilterCategoryMenu";
import type { FilterState } from "./FilterState";
import { getFilterCategoryDefinition, type FilterGroup } from "./util";

/** One category's submenu, as a function so the menu can read it. */
function getCategorySubmenu(state: FilterState, filterGroup: FilterGroup) {
  const categoryDef = getFilterCategoryDefinition(filterGroup.category);
  return (
    <SubMenu key={filterGroup.category}>
      <MenuItem icon={<categoryDef.icon />}>{categoryDef.label}</MenuItem>
      <SubMenuContent>
        {getFilterCategoryItems({ state, filterGroup })}
      </SubMenuContent>
    </SubMenu>
  );
}

export function FilterSearchMenu(props: { state: FilterState }) {
  const { state } = props;
  return (
    <Menu
      side="bottom"
      align="start"
      aria-label="Filters"
      search="Search filters…"
      noResultsPlaceholder="No results"
    >
      {state.filterGroups.map((filterGroup) =>
        getCategorySubmenu(state, filterGroup),
      )}
    </Menu>
  );
}
