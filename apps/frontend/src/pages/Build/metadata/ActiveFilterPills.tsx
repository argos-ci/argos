import clsx from "clsx";
import { XIcon } from "lucide-react";
import { Button, type Selection } from "react-aria-components";

import { MenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

import {
  CategoryIcon,
  categoryPluralLabels,
  TagValueIcon,
} from "./MetadataCategories";
import { MetadataCategoryMenu } from "./MetadataCategoryMenu";
import {
  getTagsForCategory,
  resolveSelectionKeys,
  updateCategoryFilters,
  useMetadataFilterState,
  type MetadataTag,
} from "./MetadataFilterState";

const segmentClassName =
  "border-primary text-primary-low flex h-5 items-center border leading-none select-none";

const PillSegment = (props: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={clsx(segmentClassName, "-ml-px", props.className)}>
      {props.children}
    </div>
  );
};

const StackedIcons = (props: {
  category: string;
  activeTags: { key: string; value: string }[];
}) => {
  return (
    <div className="flex items-center -space-x-1">
      {props.activeTags.map((tag) => (
        <span
          key={tag.key}
          className="bg-app group-hover:bg-hover rounded-full"
        >
          <TagValueIcon category={props.category} value={tag.value} />
        </span>
      ))}
    </div>
  );
};

const PillValueButton = (props: {
  category: string;
  activeTags: { key: string; label: string; value: string }[];
  allCategoryTags: MetadataTag[];
  selectedKeys: Set<string>;
  onSelectionChange: (selection: Selection) => void;
}) => {
  const { category, activeTags, allCategoryTags, selectedKeys } = props;
  const isMultiple = activeTags.length > 1;
  const tagLabel = isMultiple
    ? `${activeTags.length} ${categoryPluralLabels[category] ?? category.toLowerCase()}`
    : (activeTags[0]?.label ?? "");

  return (
    <MenuTrigger>
      <Button
        className={clsx(
          segmentClassName,
          "group hover:bg-hover -ml-px min-w-0 cursor-pointer gap-1 px-1.5",
        )}
      >
        {isMultiple ? (
          <StackedIcons category={category} activeTags={activeTags} />
        ) : activeTags[0] ? (
          <TagValueIcon category={category} value={activeTags[0].value} />
        ) : null}
        <span className="text-xxs max-w-32 truncate">{tagLabel}</span>
      </Button>

      <Popover placement="bottom start">
        <MetadataCategoryMenu
          category={category}
          tags={allCategoryTags}
          selectedKeys={selectedKeys}
          onSelectionChange={props.onSelectionChange}
          className="min-w-32"
          splitSelected
        />
      </Popover>
    </MenuTrigger>
  );
};

const ActiveFilterPill = (props: {
  category: string;
  activeTags: { key: string; label: string; value: string }[];
  allCategoryTags: MetadataTag[];
  selectedFilters: string[];
  setSelectedFilters: (filters: string[]) => void;
}) => {
  const {
    category,
    activeTags,
    allCategoryTags,
    selectedFilters,
    setSelectedFilters,
  } = props;

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
    <div className="text-xxs text-low flex min-w-0 items-center font-medium">
      <PillSegment className="rounded-l-chip shrink-0 gap-1 px-1.5">
        <CategoryIcon category={category} />
        <span>{category}</span>
      </PillSegment>

      <PillSegment className="shrink-0 px-1">
        <span>{isMultiple ? "is any of" : "is"}</span>
      </PillSegment>

      <PillValueButton
        category={category}
        activeTags={activeTags}
        allCategoryTags={allCategoryTags}
        selectedKeys={selectedKeys}
        onSelectionChange={handleSelectionChange}
      />

      <Button
        className={clsx(
          segmentClassName,
          "hover:bg-hover hover:text rounded-r-chip -ml-px cursor-pointer px-1",
        )}
        onPress={handleRemove}
        aria-label={`Remove ${category} filter`}
      >
        <XIcon className="size-3" />
      </Button>
    </div>
  );
};

export const ActiveFilterPills = () => {
  const { tags, selectedFilters, setSelectedFilters } =
    useMetadataFilterState();

  if (selectedFilters.length === 0) {
    return null;
  }

  // Group active filters by category
  const activeByCategory = new Map<
    string,
    { key: string; label: string; value: string }[]
  >();
  for (const filterKey of selectedFilters) {
    const tag = tags.find((t) => `${t.category}:${t.value}` === filterKey);
    if (!tag) {
      continue;
    }

    const list = activeByCategory.get(tag.category) ?? [];
    list.push({
      key: filterKey,
      label: tag.label,
      value: tag.value,
    });
    activeByCategory.set(tag.category, list);
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
      {Array.from(activeByCategory.entries()).map(([category, activeTags]) => (
        <ActiveFilterPill
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
