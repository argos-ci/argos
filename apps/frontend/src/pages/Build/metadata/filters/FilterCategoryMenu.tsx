import { Fragment } from "react";
import type { Selection } from "react-aria-components";

import { Menu, MenuCheckboxItem, MenuSeparator } from "@/ui/Menu";

import { FilterIcon } from "./FilterIcon";
import {
  getFilterCategoryDefinition,
  type Filter,
  type FilterCategory,
} from "./util";

export const FilterCategoryMenu = (props: {
  category: FilterCategory;
  filters: Filter[];
  selectedKeys: Set<string>;
  onSelectionChange: (selection: Selection) => void;
  className?: string;
  onOptionClick?: () => void;
  splitSelected?: boolean;
}) => {
  const {
    filters,
    category,
    selectedKeys,
    splitSelected,
    onSelectionChange,
    className,
    onOptionClick,
  } = props;
  const categoryLabel = getFilterCategoryDefinition(category).label;

  const checked = filters.filter((filter) => selectedKeys.has(filter.key));
  const unchecked = filters.filter((filter) => !selectedKeys.has(filter.key));
  const visibleFilters = splitSelected ? [...checked, ...unchecked] : filters;
  const showMenuSeparator =
    splitSelected && checked.length > 0 && unchecked.length > 0;

  return (
    <Menu
      aria-label={`${categoryLabel} filters`}
      selectionMode="multiple"
      selectedKeys={selectedKeys}
      onSelectionChange={onSelectionChange}
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
          <FilterIcon filter={filter} className="size-4" />
          <span className="truncate">{filter.label}</span>
        </div>
        <span className="text-low shrink-0 text-xs">{filter.count}</span>
      </div>
    </MenuCheckboxItem>
  );
};
