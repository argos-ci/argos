import { XIcon } from "lucide-react";
import { type Selection } from "react-aria-components";

import { Chip, ChipSegment, ChipSegmentButton } from "@/ui/Chip";
import { MenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { StackedItems } from "@/ui/StackedItems";

import {
  getMetadataCategoryDefinition,
  MetadataCategory,
} from "../metadataCategories";
import { CategoryIcon, TagValueIcon } from "../MetadataTagIcons";
import { MetadataCategoryMenu } from "./MetadataCategoryMenu";
import { useMetadataFilterState } from "./MetadataFilterState";
import {
  getFilterKey,
  getTagsForCategory,
  resolveSelectionKeys,
  updateCategoryFilters,
  type MetadataTag,
} from "./metadataFilterUtils";

type ActiveTag = {
  key: string;
  label: string;
  value: string;
};

const StackedChipValueIcons = ({
  activeTags,
  category,
}: {
  activeTags: ActiveTag[];
  category: MetadataCategory;
}) => (
  <StackedItems>
    {Array.from(activeTags)
      .sort((a, b) => a.value.localeCompare(b.value))
      .map((tag) => (
        <span
          key={tag.key}
          className="bg-app group-data-hovered/chip-segment:bg-primary-hover group-data-pressed/chip-segment:bg-primary-active rounded-full"
        >
          <TagValueIcon
            category={category}
            value={tag.value}
            className="size-3"
          />
        </span>
      ))}
  </StackedItems>
);

const ChipValueButton = ({
  category,
  activeTags,
  allCategoryTags,
  selectedKeys,
  onSelectionChange,
}: {
  category: MetadataCategory;
  activeTags: ActiveTag[];
  allCategoryTags: MetadataTag[];
  selectedKeys: Set<string>;
  onSelectionChange: (selection: Selection) => void;
}) => {
  const isMultiple = activeTags.length > 1;
  const categoryDefinition = getMetadataCategoryDefinition(category);
  const tagLabel = isMultiple
    ? `${activeTags.length} ${categoryDefinition.pluralLabel}`
    : (activeTags[0]?.label ?? "");

  return (
    <MenuTrigger>
      <ChipSegmentButton color="success">
        <StackedChipValueIcons category={category} activeTags={activeTags} />
        <span className="text-xxs max-w-32 truncate">{tagLabel}</span>
      </ChipSegmentButton>
      <Popover placement="bottom start">
        <MetadataCategoryMenu
          category={category}
          tags={allCategoryTags}
          selectedKeys={selectedKeys}
          onSelectionChange={onSelectionChange}
          className="min-w-32"
          splitSelected
        />
      </Popover>
    </MenuTrigger>
  );
};

const FilterChip = ({
  category,
  activeTags,
  allCategoryTags,
  selectedFilters,
  setSelectedFilters,
}: {
  category: MetadataCategory;
  activeTags: ActiveTag[];
  allCategoryTags: MetadataTag[];
  selectedFilters: string[];
  setSelectedFilters: (filters: string[]) => void;
}) => {
  const categoryLabel = getMetadataCategoryDefinition(category).label;
  const selectedKeys = new Set(activeTags.map((t) => t.key));

  function handleSelectionChange(selection: Selection) {
    const allKeys = allCategoryTags.map((t) => `${t.category}:${t.value}`);
    const nextKeys = resolveSelectionKeys(selection, allKeys);
    setSelectedFilters(
      updateCategoryFilters(category, nextKeys, selectedFilters),
    );
  }

  function handleRemove() {
    setSelectedFilters(
      selectedFilters.filter((f) => !f.startsWith(`${category}:`)),
    );
  }

  const isMultiple = activeTags.length > 1;

  return (
    <Chip segmented scale="xs">
      <ChipSegment className="shrink-0">
        <CategoryIcon category={category} />
        <span>{categoryLabel}</span>
      </ChipSegment>
      <ChipSegment className="shrink-0">
        {isMultiple ? "is any of" : "is"}
      </ChipSegment>
      <ChipValueButton
        category={category}
        activeTags={activeTags}
        allCategoryTags={allCategoryTags}
        selectedKeys={selectedKeys}
        onSelectionChange={handleSelectionChange}
      />
      <ChipSegmentButton
        onPress={handleRemove}
        aria-label={`Remove ${categoryLabel} filter`}
      >
        <XIcon className="size-3" />
      </ChipSegmentButton>
    </Chip>
  );
};

function groupFiltersByCategory(
  selectedFilters: string[],
  tags: MetadataTag[],
): [MetadataCategory, ActiveTag[]][] {
  const activeByCategory = new Map<MetadataCategory, ActiveTag[]>();
  const tagsByKey = new Map(tags.map((tag) => [getFilterKey(tag), tag]));

  for (const filterKey of selectedFilters) {
    const tag = tagsByKey.get(filterKey);
    if (!tag) {
      continue;
    }

    const list = activeByCategory.get(tag.category) ?? [];
    list.push({ key: filterKey, label: tag.label, value: tag.value });
    activeByCategory.set(tag.category, list);
  }

  return Array.from(activeByCategory.entries());
}

export const FilterChips = () => {
  const { tags, selectedFilters, setSelectedFilters } =
    useMetadataFilterState();

  if (selectedFilters.length === 0) {
    return null;
  }

  const filterCategories = groupFiltersByCategory(selectedFilters, tags);

  return (
    <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
      {filterCategories.map(([category, activeTags]) => (
        <FilterChip
          key={category}
          category={category}
          activeTags={activeTags}
          allCategoryTags={getTagsForCategory(tags, category)}
          selectedFilters={selectedFilters}
          setSelectedFilters={setSelectedFilters}
        />
      ))}
    </div>
  );
};
