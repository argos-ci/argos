import { Fragment } from "react";

import { Menu, MenuItem, MenuSeparator } from "@/ui/menu-kit";

import { FilterIcon } from "./FilterIcon";
import type { FilterState } from "./FilterState";
import { getFilterCategoryDefinition, type FilterGroup } from "./util";

/**
 * The rows for one category, as a plain function rather than a component.
 *
 * A menu reads its children, so it cannot see inside a component — these have
 * to reach it directly, whether it is this category's own menu or the search
 * menu listing every category as a submenu.
 */
export function getFilterCategoryItems(props: {
  filterGroup: FilterGroup;
  state: FilterState;
  splitSelected?: boolean;
}) {
  const { filterGroup, state, splitSelected } = props;
  const { getFilterByKey } = state;
  const selectedKeys = state.active.intersection(filterGroup.filterKeys);
  const { showMenuSeparator, checked, visibleFilters } = (() => {
    const filters = Array.from(filterGroup.filterKeys).map((key) =>
      getFilterByKey(key),
    );
    const checked = filters.filter((filter) => selectedKeys.has(filter.key));
    const unchecked = filters.filter((filter) => !selectedKeys.has(filter.key));
    const visibleFilters = splitSelected ? [...checked, ...unchecked] : filters;
    const showMenuSeparator =
      splitSelected && checked.length > 0 && unchecked.length > 0;
    return { checked, visibleFilters, showMenuSeparator };
  })();

  return visibleFilters.map((filter, index) => {
    return (
      <Fragment key={filter.key}>
        {showMenuSeparator && index === checked.length && <MenuSeparator />}
        <MenuItem
          icon={<FilterIcon filter={filter} />}
          suffix={
            <>
              {filter.count} {filter.count === 1 ? "item" : "items"}
            </>
          }
          checkbox
          textValue={filter.label}
          checked={selectedKeys.has(filter.key)}
          onCheckedChange={(checked: boolean) => {
            const next = new Set(selectedKeys);
            if (checked) {
              next.add(filter.key);
            } else {
              next.delete(filter.key);
            }
            const otherKeys = state.active.difference(filterGroup.filterKeys);
            state.setActive(otherKeys.union(next));
          }}
        >
          {filter.label}
        </MenuItem>
      </Fragment>
    );
  });
}

/** That category on its own, for the chip that opens just this one. */
export function FilterCategoryMenu(props: {
  filterGroup: FilterGroup;
  state: FilterState;
  className?: string;
  splitSelected?: boolean;
}) {
  const { className, ...rest } = props;
  const categoryDef = getFilterCategoryDefinition(props.filterGroup.category);
  return (
    <Menu aria-label={`${categoryDef.label} filters`} className={className}>
      {getFilterCategoryItems(rest)}
    </Menu>
  );
}
