import { memo, use } from "react";
import { invariant } from "@argos/util/invariant";
import { XIcon } from "lucide-react";

import { ButtonGroup } from "@/ui/ButtonGroup";
import { Chip, ChipButton } from "@/ui/Chip";
import { MenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { StackedItems } from "@/ui/StackedItems";
import { Truncable } from "@/ui/Truncable";

import { FilterCategoryMenu } from "./FilterCategoryMenu";
import { FilterIcon } from "./FilterIcon";
import { FilterStateContext, type FilterState } from "./FilterState";
import { getFilterCategoryDefinition, type FilterGroup } from "./util";

export const FilterChips = memo(() => {
  const state = use(FilterStateContext);
  invariant(state, "Must be used in a filter context");

  if (state.active.size === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
      {Array.from(getActiveFilterGroups(state).values(), (filterGroup) => (
        <FilterChip
          key={filterGroup.category}
          filterGroup={filterGroup}
          state={state}
        />
      ))}
    </div>
  );
});

function getActiveFilterGroups(state: FilterState) {
  const groups = new Set<FilterGroup>();
  for (const key of state.active) {
    const group = state.filterGroups.find((group) => group.filterKeys.has(key));
    invariant(group, "Group not found");
    groups.add(group);
  }

  return groups;
}

const FilterChip = (props: {
  filterGroup: FilterGroup;
  state: FilterState;
}) => {
  const { filterGroup, state } = props;
  const categoryDef = getFilterCategoryDefinition(filterGroup.category);
  const selectedKeys = filterGroup.filterKeys.intersection(state.active);

  return (
    <ButtonGroup className="min-w-0">
      <Chip scale="xs" icon={categoryDef.icon} className="shrink-0">
        {categoryDef.label}
      </Chip>
      <Chip scale="xs" className="shrink-0">
        {selectedKeys.size > 1 ? "is any of" : "is"}
      </Chip>
      <ChipValueButton filterGroup={filterGroup} state={state} />
      <ChipButton
        className="shrink-0"
        scale="xs"
        icon={XIcon}
        onPress={() => {
          const otherKeys = state.active.difference(filterGroup.filterKeys);
          state.setActive(otherKeys);
        }}
        aria-label={`Remove ${categoryDef.label} filter`}
      />
    </ButtonGroup>
  );
};

const ChipValueButton = (props: {
  filterGroup: FilterGroup;
  state: FilterState;
}) => {
  const { filterGroup, state } = props;
  const selectedKeys = state.active.intersection(filterGroup.filterKeys);
  const categoryDef = getFilterCategoryDefinition(filterGroup.category);

  const label = (() => {
    if (selectedKeys.size > 1) {
      return `${selectedKeys.size} ${categoryDef.pluralLabel}`;
    }
    const firstKey = Array.from(selectedKeys)[0];
    invariant(firstKey, "At least one filter should be active");
    return state.getFilterByKey(firstKey).label;
  })();

  return (
    <MenuTrigger>
      <ChipButton className="min-w-0" scale="xs">
        <div className="flex items-center gap-(--chip-gap)">
          <StackedItems>
            {Array.from(selectedKeys)
              .map((key) => state.getFilterByKey(key))
              .sort((a, b) => a.value.localeCompare(b.value))
              .map((filter) => {
                return (
                  <FilterIcon
                    key={filter.key}
                    filter={filter}
                    className="bg-primary-app size-[1em] shrink-0 rounded-full ring-[0.5px] ring-(--background-color-primary-app)"
                  />
                );
              })}
          </StackedItems>
          <Truncable className="text-xxs">{label}</Truncable>
        </div>
      </ChipButton>
      <Popover placement="bottom start">
        <FilterCategoryMenu
          filterGroup={filterGroup}
          state={state}
          className="min-w-32"
          splitSelected
        />
      </Popover>
    </MenuTrigger>
  );
};
