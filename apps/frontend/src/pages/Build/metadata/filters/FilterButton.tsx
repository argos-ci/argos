import { memo, use, useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { createHideableComponent } from "@react-aria/collections";
import { FilterIcon } from "lucide-react";
import type { Selection } from "react-aria-components";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { Menu, MenuItem, MenuTrigger, SubmenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

import { FilterCategoryMenu } from "./FilterCategoryMenu";
import { FilterStateContext, type FilterState } from "./FilterState";
import {
  checkIsCategoryFilterKey,
  getFilterCategoryDefinition,
  groupFiltersByCategory,
  resolveSelectionKeys,
  setCategoryFilters,
  type Filter,
  type FilterCategory,
} from "./util";

type CategoryGroup = {
  category: FilterCategory;
  label: string;
  filters: Filter[];
};

function getCategoryGroups(
  filtersByCategory: Map<FilterCategory, Filter[]>,
): CategoryGroup[] {
  return Array.from(filtersByCategory.entries())
    .map(([category, filters]) => ({
      category,
      label: getFilterCategoryDefinition(category).label,
      filters,
    }))
    .filter((group) => group.filters.length > 1);
}

export const FilterButton = memo(function FilterButton() {
  const state = use(FilterStateContext);
  invariant(state, "Must be used in a filter context");
  const filtersByCategory = useMemo(
    () => groupFiltersByCategory(state.filters),
    [state.filters],
  );
  const categoryGroups = useMemo(
    () => getCategoryGroups(filtersByCategory),
    [filtersByCategory],
  );
  if (categoryGroups.length === 0) {
    return null;
  }

  return (
    <InnerFilterButton
      state={state}
      filtersByCategory={filtersByCategory}
      categoryGroups={categoryGroups}
    />
  );
});

// This is needed because of https://github.com/adobe/react-spectrum/issues/9011
const InnerFilterButton = createHideableComponent(
  function InnerFilterButton(props: {
    state: FilterState;
    filtersByCategory: Map<FilterCategory, Filter[]>;
    categoryGroups: CategoryGroup[];
  }) {
    const { categoryGroups, filtersByCategory, state } = props;
    const [isOpen, setIsOpen] = useState(false);
    const filterHotKey = useBuildHotkey("toggleFilters", () => setIsOpen(true));

    function handleSelectionChange(
      category: FilterCategory,
      selection: Selection,
    ) {
      const categoryFilters = filtersByCategory.get(category);
      invariant(categoryFilters, `No tags found for category: ${category}`);

      const allKeys = categoryFilters.map((filter) => filter.key);
      const nextKeys = resolveSelectionKeys(selection, allKeys);
      state.setActive(setCategoryFilters(category, nextKeys, state.active));
    }

    return (
      <MenuTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
        <HotkeyTooltip
          keys={filterHotKey.displayKeys}
          description={filterHotKey.description}
        >
          <IconButton size="small">
            <FilterIcon />
          </IconButton>
        </HotkeyTooltip>

        <Popover placement="bottom start" className="bg-app min-w-40">
          <Menu autoFocus aria-label="Filters" className="w-full">
            {categoryGroups.map(({ category, label, filters }) => {
              const selectedKeys = new Set(
                state.active.filter((key) =>
                  checkIsCategoryFilterKey(key, category),
                ),
              );
              const Icon = getFilterCategoryDefinition(category).icon;
              return (
                <SubmenuTrigger key={category} delay={0}>
                  <MenuItem id={category}>
                    <div className="grid grid-cols-[1em_auto] items-center gap-2">
                      <Icon className="size-4" />
                      <div>{label}</div>
                    </div>
                  </MenuItem>
                  <Popover>
                    <FilterCategoryMenu
                      category={category}
                      filters={filters}
                      selectedKeys={selectedKeys}
                      onSelectionChange={(selection) =>
                        handleSelectionChange(category, selection)
                      }
                      className="min-w-32"
                      onOptionClick={() => setIsOpen(false)}
                    />
                  </Popover>
                </SubmenuTrigger>
              );
            })}
          </Menu>
        </Popover>
      </MenuTrigger>
    );
  },
);
