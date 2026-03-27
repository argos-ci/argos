import { useState } from "react";
import { fuzzy } from "fast-fuzzy";
import { SearchIcon, XIcon } from "lucide-react";
import {
  Autocomplete,
  Button,
  Input,
  SearchField,
} from "react-aria-components";

import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuItemSuffix,
  SubmenuTrigger,
} from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

import { FilterCategoryMenu } from "./FilterCategoryMenu";
import type { FilterState } from "./FilterState";
import {
  getFilterCategoryDefinition,
  type Filter,
  type FilterGroup,
} from "./util";

function buildMenuItems(state: FilterState, searchActive: boolean) {
  const items: (
    | { type: "category"; filterGroup: FilterGroup }
    | { type: "filter"; filter: Filter; filterGroup: FilterGroup }
  )[] = [];
  for (const filterGroup of state.filterGroups) {
    items.push({ type: "category", filterGroup });
    if (searchActive) {
      for (const filterKey of filterGroup.filterKeys) {
        items.push({
          type: "filter",
          filter: state.getFilterByKey(filterKey),
          filterGroup,
        });
      }
    }
  }
  return items;
}

function toggleFilter(
  state: FilterState,
  filter: Filter,
  filterGroup: FilterGroup,
) {
  const otherKeys = state.active.difference(filterGroup.filterKeys);
  const selectedKeys = state.active.intersection(filterGroup.filterKeys);
  const newSelected = new Set(selectedKeys);
  if (newSelected.has(filter.key)) {
    newSelected.delete(filter.key);
  } else {
    newSelected.add(filter.key);
  }
  state.setActive(otherKeys.union(newSelected));
}

const CategorySubmenuItem = (props: {
  state: FilterState;
  filterGroup: FilterGroup;
}) => {
  const { state, filterGroup } = props;
  const categoryDef = getFilterCategoryDefinition(filterGroup.category);
  return (
    <SubmenuTrigger delay={0}>
      <MenuItem id={filterGroup.category} textValue={categoryDef.label}>
        <MenuItemIcon>
          <categoryDef.icon />
        </MenuItemIcon>
        {categoryDef.label}
      </MenuItem>
      <Popover>
        <FilterCategoryMenu
          state={state}
          filterGroup={filterGroup}
          className="min-w-32"
        />
      </Popover>
    </SubmenuTrigger>
  );
};

const FlatFilterItem = (props: {
  state: FilterState;
  filter: Filter;
  filterGroup: FilterGroup;
}) => {
  const { state, filter, filterGroup } = props;
  const categoryDef = getFilterCategoryDefinition(filterGroup.category);
  return (
    <MenuItem
      id={filter.key}
      textValue={`${categoryDef.label} ${filter.label}`}
      onAction={() => toggleFilter(state, filter, filterGroup)}
    >
      <MenuItemIcon>
        <categoryDef.icon />
      </MenuItemIcon>
      <span className="text-low">{categoryDef.label}</span>
      <span className="text-low mx-1">›</span>
      {filter.label}
      <MenuItemSuffix>
        {filter.count} {filter.count === 1 ? "item" : "items"}
      </MenuItemSuffix>
    </MenuItem>
  );
};

function filterFuzzy(textValue: string, inputValue: string): boolean {
  return fuzzy(inputValue, textValue) > 0.7;
}

export const FilterSearchMenu = (props: { state: FilterState }) => {
  const { state } = props;
  const [inputValue, setInputValue] = useState("");
  const searchActive = inputValue.length > 0;
  const menuItems = buildMenuItems(state, searchActive);

  return (
    <Autocomplete
      inputValue={inputValue}
      onInputChange={setInputValue}
      filter={filterFuzzy}
    >
      <div className="flex w-full flex-col gap-1" data-hotkeys-disabled>
        <SearchField
          aria-label="Search filters"
          autoFocus
          className="border-b"
          value={inputValue}
          onChange={setInputValue}
        >
          <div className="relative flex items-center px-3 py-1.5">
            <SearchIcon className="text-placeholder mr-2 size-4 shrink-0" />
            <Input
              className="placeholder:text-placeholder w-full text-sm outline-none"
              placeholder="Search filters…"
            />
            {searchActive && (
              <Button
                className="bg-subtle text-placeholder hover:text-default absolute right-2.5 shrink-0"
                onClick={() => setInputValue("")}
              >
                <XIcon className="size-4" />
              </Button>
            )}
          </div>
        </SearchField>
        <Menu
          aria-label="Filters"
          className="max-h-64 w-full overflow-y-auto"
          renderEmptyState={() => (
            <p className="text-low px-2 py-1.5 text-xs">No results</p>
          )}
        >
          {menuItems.map((item) =>
            item.type === "category" ? (
              <CategorySubmenuItem
                key={item.filterGroup.category}
                state={state}
                filterGroup={item.filterGroup}
              />
            ) : (
              <FlatFilterItem
                key={item.filter.key}
                state={state}
                filter={item.filter}
                filterGroup={item.filterGroup}
              />
            ),
          )}
        </Menu>
      </div>
    </Autocomplete>
  );
};
