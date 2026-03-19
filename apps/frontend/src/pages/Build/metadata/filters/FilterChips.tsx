import { memo, use } from "react";
import { invariant } from "@argos/util/invariant";
import { XIcon } from "lucide-react";
import { type Selection } from "react-aria-components";

import { Chip, ChipSegment, ChipSegmentButton } from "@/ui/Chip";
import { MenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { StackedItems } from "@/ui/StackedItems";

import { MetadataCategory } from "../metadataCategories";
import { FilterCategoryMenu } from "./FilterCategoryMenu";
import { FilterIcon } from "./FilterIcon";
import { FilterStateContext } from "./FilterState";
import {
  checkIsCategoryFilterKey,
  FilterCategory,
  getFilterCategoryDefinition,
  resolveSelectionKeys,
  setCategoryFilters,
  type Filter,
} from "./util";

const StackedChipValueIcons = (props: { filters: Filter[] }) => {
  const { filters } = props;
  return (
    <StackedItems>
      {Array.from(filters)
        .sort((a, b) => a.value.localeCompare(b.value))
        .map((filter) => (
          <span
            key={filter.key}
            className="bg-app group-data-hovered/chip-segment:bg-primary-hover group-data-pressed/chip-segment:bg-primary-active rounded-full"
          >
            <FilterIcon filter={filter} className="size-3" />
          </span>
        ))}
    </StackedItems>
  );
};

const ChipValueButton = (props: {
  category: FilterCategory;
  filters: Filter[];
  selectedKeys: Set<string>;
  onSelectionChange: (selection: Selection) => void;
}) => {
  const { category, filters, selectedKeys, onSelectionChange } = props;
  const isMultiple = selectedKeys.size > 1;
  const categoryDefinition = getFilterCategoryDefinition(category);
  const activeFilters = filters.filter((filter) =>
    selectedKeys.has(filter.key),
  );
  const firstActiveFilter = activeFilters[0];
  invariant(firstActiveFilter, "At least one filter should be active");
  const tagLabel = isMultiple
    ? `${selectedKeys.size} ${categoryDefinition.pluralLabel}`
    : firstActiveFilter.label;
  const showIcons =
    category !== MetadataCategory.snapshotTag &&
    category !== MetadataCategory.testTag;

  return (
    <MenuTrigger>
      <ChipSegmentButton>
        {showIcons && <StackedChipValueIcons filters={activeFilters} />}
        <span className="text-xxs max-w-32 truncate">{tagLabel}</span>
      </ChipSegmentButton>
      <Popover placement="bottom start">
        <FilterCategoryMenu
          category={category}
          filters={filters}
          selectedKeys={selectedKeys}
          onSelectionChange={onSelectionChange}
          className="min-w-32"
          splitSelected
        />
      </Popover>
    </MenuTrigger>
  );
};

const FilterChip = (props: {
  category: FilterCategory;
  filters: Filter[];
  active: string[];
  setActive: (filters: string[]) => void;
}) => {
  const { category, filters, active, setActive } = props;
  const categoryLabel = getFilterCategoryDefinition(category).label;
  const selectedKeys = new Set(
    filters
      .filter((filter) => active.includes(filter.key))
      .map((filter) => filter.key),
  );

  const isMultiple = selectedKeys.size > 1;

  const CategoryIcon = getFilterCategoryDefinition(category).icon;

  return (
    <Chip segmented scale="xs">
      <ChipSegment className="shrink-0">
        <CategoryIcon className="size-3" />
        <span>{categoryLabel}</span>
      </ChipSegment>
      <ChipSegment className="shrink-0">
        {isMultiple ? "is any of" : "is"}
      </ChipSegment>
      <ChipValueButton
        category={category}
        filters={filters}
        selectedKeys={selectedKeys}
        onSelectionChange={(selection) => {
          const allKeys = filters.map((filter) => filter.key);
          const nextKeys = resolveSelectionKeys(selection, allKeys);
          setActive(setCategoryFilters(category, nextKeys, active));
        }}
      />
      <ChipSegmentButton
        onPress={() =>
          setActive(
            active.filter((key) => !checkIsCategoryFilterKey(key, category)),
          )
        }
        aria-label={`Remove ${categoryLabel} filter`}
      >
        <XIcon className="size-3" />
      </ChipSegmentButton>
    </Chip>
  );
};

function getActiveCategories(
  active: string[],
  filters: Filter[],
): FilterCategory[] {
  const activeCategories = new Set<FilterCategory>();
  const filterByKey = new Map(filters.map((filter) => [filter.key, filter]));

  for (const key of active) {
    const filter = filterByKey.get(key);
    invariant(filter, "Filter not found");
    activeCategories.add(filter.category);
  }

  return Array.from(activeCategories);
}

export const FilterChips = memo(() => {
  const state = use(FilterStateContext);
  invariant(state, "Must be used in a filter context");

  if (state.active.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
      {getActiveCategories(state.active, state.filters).map((category) => (
        <FilterChip
          key={category}
          filters={state.filters.filter(
            (filter) => filter.category === category,
          )}
          category={category}
          active={state.active}
          setActive={state.setActive}
        />
      ))}
    </div>
  );
});
