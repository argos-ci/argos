import { useState } from "react";
import { FilterIcon } from "lucide-react";
import type { Selection } from "react-aria-components";

import { IconButton } from "@/ui/IconButton";
import {
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuTrigger,
  SubmenuTrigger,
} from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

import { MetadataFilterContextValue } from "./MetadataFilterState";

function getTagsByCategory(tags: MetadataFilterContextValue["tags"]) {
  const tagsByCategory = new Map<string, MetadataFilterContextValue["tags"]>();
  for (const tag of tags) {
    const list = tagsByCategory.get(tag.category);
    if (!list) {
      tagsByCategory.set(tag.category, [tag]);
      continue;
    }
    list.push(tag);
  }
  return tagsByCategory;
}

function getCategoryFilters(props: { category: string; filters: string[] }) {
  return new Set(
    props.filters.filter((filter) => filter.startsWith(`${props.category}:`)),
  );
}

export function FilterButton({
  tags,
  selectedFilters,
  setSelectedFilters,
}: MetadataFilterContextValue) {
  const [isOpen, setIsOpen] = useState(false);
  const hasActiveFilters = selectedFilters.length > 0;
  const tagsByCategory = getTagsByCategory(tags);

  const filterGroups = Array.from(tagsByCategory.entries()).map(
    ([category, categoryTags]) => ({
      key: category,
      label: category,
      options: categoryTags.map((tag) => ({
        key: `${tag.category}:${tag.value}`,
        label: tag.label,
        count: tag.count,
      })),
    }),
  );

  function handleCategorySelectionChange(
    category: string,
    selection: Selection,
  ) {
    const group = filterGroups.find((group) => group.key === category);
    if (!group) {
      return;
    }

    const nextCategoryFilters =
      selection === "all"
        ? group.options.map((option) => option.key)
        : Array.from(selection, String);
    const filtersOutsideCategory = selectedFilters.filter(
      (filter) => !filter.startsWith(`${category}:`),
    );
    setSelectedFilters([...filtersOutsideCategory, ...nextCategoryFilters]);
  }

  return (
    <MenuTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <IconButton size="small" aria-pressed={hasActiveFilters}>
        <FilterIcon />
      </IconButton>
      <Popover placement="bottom start" className="bg-app w-40">
        {isOpen ? (
          <Menu aria-label="Metadata filters" className="w-full">
            {filterGroups.map((group) => {
              const category = group.key;
              const selectedCategoryFilters = getCategoryFilters({
                category,
                filters: selectedFilters,
              });

              return (
                <SubmenuTrigger key={group.key}>
                  <MenuItem id={group.key}>{group.label}</MenuItem>
                  <Popover className="bg-white">
                    <Menu
                      aria-label={`${group.label} filters`}
                      selectionMode="multiple"
                      selectedKeys={selectedCategoryFilters}
                      onSelectionChange={(selection) =>
                        handleCategorySelectionChange(category, selection)
                      }
                      className="min-w-32"
                    >
                      {group.options.map((option) => (
                        <MenuCheckboxItem
                          key={option.key}
                          id={option.key}
                          textValue={option.label}
                        >
                          <div className="flex flex-1 items-center justify-between gap-6">
                            <span className="truncate">{option.label}</span>
                            <span className="text-low shrink-0 text-xs">
                              {option.count}
                            </span>
                          </div>
                        </MenuCheckboxItem>
                      ))}
                    </Menu>
                  </Popover>
                </SubmenuTrigger>
              );
            })}
          </Menu>
        ) : null}
      </Popover>
    </MenuTrigger>
  );
}
