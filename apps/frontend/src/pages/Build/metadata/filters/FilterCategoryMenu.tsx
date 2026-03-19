import { Fragment, useState } from "react";

import { Menu, MenuCheckboxItem, MenuSeparator } from "@/ui/Menu";

import { FilterIcon } from "./FilterIcon";
import type { FilterState } from "./FilterState";
import {
  getFilterCategoryDefinition,
  type Filter,
  type FilterGroup,
} from "./util";

export const FilterCategoryMenu = (props: {
  filterGroup: FilterGroup;
  state: FilterState;
  className?: string;
  onOptionClick?: () => void;
  splitSelected?: boolean;
}) => {
  const { filterGroup, state, splitSelected, className, onOptionClick } = props;
  const { getFilterByKey } = state;
  const categoryDef = getFilterCategoryDefinition(filterGroup.category);
  const selectedKeys = state.active.intersection(filterGroup.filterKeys);
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
            <FilterCategoryMenuOption
              filter={filter}
              onOptionClick={onOptionClick}
            />
          </Fragment>
        );
      })}
    </Menu>
  );
};

const FilterCategoryMenuOption = (props: {
  filter: Filter;
  onOptionClick?: () => void;
}) => {
  const { filter, onOptionClick } = props;

  return (
    <MenuCheckboxItem id={filter.key} textValue={filter.label}>
      <div
        className="flex flex-1 items-center justify-between gap-6"
        onClick={onOptionClick}
      >
        <div className="flex items-center gap-2">
          <FilterIcon filter={filter} className="size-4 shrink-0" />
          <span className="truncate">{filter.label}</span>
        </div>
        <span className="text-low shrink-0 text-xs">{filter.count}</span>
      </div>
    </MenuCheckboxItem>
  );
};
