import { FilterIcon } from "lucide-react";
import { CheckboxGroup } from "react-aria-components";

import { Checkbox } from "@/ui/Checkbox";
import { DialogTrigger } from "@/ui/Dialog";
import { IconButton } from "@/ui/IconButton";
import { Popover } from "@/ui/Popover";

import { MetadataFilterContextValue } from "./MetadataFilterState";

function getTagsByCategory(tags: MetadataFilterContextValue["tags"]) {
  const tagsByCategory = new Map<string, MetadataFilterContextValue["tags"]>();

  for (const tag of tags) {
    const categoryTags = tagsByCategory.get(tag.category) ?? [];
    categoryTags.push(tag);
    tagsByCategory.set(tag.category, categoryTags);
  }

  return tagsByCategory;
}

function getSelectedCategoryFilters({
  categoryKeys,
  selectedFilters,
}: {
  categoryKeys: Set<string>;
  selectedFilters: string[];
}) {
  return selectedFilters.filter((filter) => categoryKeys.has(filter));
}

export function FilterButton({
  tags,
  selectedFilters,
  setSelectedFilters,
}: MetadataFilterContextValue) {
  const hasActiveFilters = selectedFilters.length > 0;
  const tagsByCategory = getTagsByCategory(tags);

  const filterGroups = Array.from(tagsByCategory.entries()).map(
    ([category, tags]) => ({
      key: category,
      label: category,
      options: tags.map((tag) => ({
        key: `${tag.category}:${tag.value}`,
        label: tag.label,
        count: tag.count,
      })),
    }),
  );

  function handleOnChange(categoryKey: string, categoryValue: string[]) {
    const nextFilters = selectedFilters.filter(
      (filter) => !filter.startsWith(`${categoryKey}:`),
    );
    setSelectedFilters([...nextFilters, ...categoryValue]);
  }

  return (
    <DialogTrigger>
      <IconButton size="small" aria-pressed={hasActiveFilters}>
        <FilterIcon />
      </IconButton>

      <Popover placement="bottom end" className="w-56">
        <div className="max-h-80 w-full overflow-auto">
          {filterGroups.map((group) => {
            const categoryKeys = new Set(
              group.options.map((option) => option.key),
            );
            const selectedCategoryFilters = getSelectedCategoryFilters({
              categoryKeys,
              selectedFilters,
            });

            return (
              <CheckboxGroup
                key={group.key}
                aria-label={group.label}
                value={selectedCategoryFilters}
                onChange={(value) => handleOnChange(group.key, value)}
                className="pb-1 last:border-b-0"
              >
                <div className="text-low text-xxs px-2 pt-1 font-semibold">
                  {group.label}
                </div>
                {group.options.map((option) => (
                  <Checkbox
                    key={option.key}
                    value={option.key}
                    className="hover:bg-hover w-full rounded-sm px-2 py-1.5 text-sm"
                  >
                    <span className="min-w-0 flex-1">{option.label}</span>
                    <span className="text-low text-xs">{option.count}</span>
                  </Checkbox>
                ))}
              </CheckboxGroup>
            );
          })}
        </div>
      </Popover>
    </DialogTrigger>
  );
}
