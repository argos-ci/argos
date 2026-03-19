import { memo, use } from "react";
import { invariant } from "@argos/util/invariant";
import { XIcon } from "lucide-react";

import { Chip, ChipSegment, ChipSegmentButton } from "@/ui/Chip";
import { MenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { StackedItems } from "@/ui/StackedItems";

import { FilterCategoryMenu } from "./FilterCategoryMenu";
import { FilterIcon } from "./FilterIcon";
import { FilterStateContext, type FilterState } from "./FilterState";
import { getFilterCategoryDefinition, type FilterGroup } from "./util";

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
      <ChipSegmentButton>
        <StackedItems>
          {Array.from(selectedKeys)
            .map((key) => state.getFilterByKey(key))
            .sort((a, b) => a.value.localeCompare(b.value))
            .map((filter) => {
              return (
                <FilterIcon
                  key={filter.key}
                  filter={filter}
                  className="bg-app group-data-hovered/chip-segment:bg-primary-hover group-data-pressed/chip-segment:bg-primary-active size-3 shrink-0 rounded-full"
                />
              );
            })}
        </StackedItems>
        <span className="text-xxs max-w-32 truncate">{label}</span>
      </ChipSegmentButton>
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

const FilterChip = (props: {
  filterGroup: FilterGroup;
  state: FilterState;
}) => {
  const { filterGroup, state } = props;
  const categoryDef = getFilterCategoryDefinition(filterGroup.category);
  const selectedKeys = filterGroup.filterKeys.intersection(state.active);

  return (
    <Chip segmented scale="xs">
      <ChipSegment className="shrink-0">
        <categoryDef.icon className="size-3" />
        <span>{categoryDef.label}</span>
      </ChipSegment>
      <ChipSegment className="shrink-0">
        {selectedKeys.size > 1 ? "is any of" : "is"}
      </ChipSegment>
      <ChipValueButton filterGroup={filterGroup} state={state} />
      <ChipSegmentButton
        onPress={() => {
          const otherKeys = state.active.difference(filterGroup.filterKeys);
          state.setActive(otherKeys);
        }}
        aria-label={`Remove ${categoryDef.label} filter`}
      >
        <XIcon className="size-3" />
      </ChipSegmentButton>
    </Chip>
  );
};

export const FilterChips = memo(() => {
  const state = use(FilterStateContext);
  invariant(state, "Must be used in a filter context");

  if (state.active.size === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
      {getActiveFilterGroups(state)
        .values()
        .map((filterGroup) => (
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
