import { Fragment, useState } from "react";

import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuItemSuffix,
  MenuSeparator,
} from "@/ui/Menu";

import { FilterIcon } from "./FilterIcon";
import type { FilterState } from "./FilterState";
import { getFilterCategoryDefinition, type FilterGroup } from "./util";

export const FilterCategoryMenu = (props: {
  filterGroup: FilterGroup;
  state: FilterState;
  className?: string;
  splitSelected?: boolean;
}) => {
  const { filterGroup, state, splitSelected, className } = props;
  const { getFilterByKey } = state;
  const categoryDef = getFilterCategoryDefinition(filterGroup.category);
  const selectedKeys = state.active.intersection(filterGroup.filterKeys);
  // Keep the initial display for splitted groups to avoid CLS while clicking on items
  const [{ showMenuSeparator, checked, visibleFilters }] = useState(() => {
    const filters = Array.from(filterGroup.filterKeys).map((key) =>
      getFilterByKey(key),
    );
    const checked = filters.filter((filter) => selectedKeys.has(filter.key));
    const unchecked = filters.filter((filter) => !selectedKeys.has(filter.key));
    const visibleFilters = splitSelected ? [...checked, ...unchecked] : filters;
    const showMenuSeparator =
      splitSelected && checked.length > 0 && unchecked.length > 0;
    return { checked, visibleFilters, showMenuSeparator };
  });

  return (
    <Menu
      aria-label={`${categoryDef.label} filters`}
      selectionMode="multiple"
      selectedKeys={selectedKeys}
      onSelectionChange={(selection) => {
        const otherKeys = state.active.difference(filterGroup.filterKeys);
        const selectedKeys =
          selection === "all"
            ? filterGroup.filterKeys
            : (selection as Set<string>);
        state.setActive(otherKeys.union(selectedKeys));
      }}
      className={className}
    >
      {visibleFilters.map((filter, index) => {
        return (
          <Fragment key={filter.key}>
            {showMenuSeparator && index === checked.length && <MenuSeparator />}
            <MenuItem id={filter.key} textValue={filter.label}>
              <MenuItemIcon>
                <FilterIcon filter={filter} />
              </MenuItemIcon>
              {filter.label}
              <MenuItemSuffix>{filter.count} items</MenuItemSuffix>
            </MenuItem>
          </Fragment>
        );
      })}
    </Menu>
  );
};
