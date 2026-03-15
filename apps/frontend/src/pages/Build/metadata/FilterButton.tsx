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

function getFiltersByCategory(category: string, filters: string[]) {
  const prefix = `${category}:`;
  const keys = new Set<string>();

  for (const filter of filters) {
    if (filter.startsWith(prefix)) {
      keys.add(filter);
    }
  }

  return keys;
}

export function FilterButton({
  tags,
  selectedFilters,
  setSelectedFilters,
}: MetadataFilterContextValue) {
  const [isOpen, setIsOpen] = useState(false);
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

  function handleSelectionChange(category: string, selection: Selection) {
    const group = filterGroups.find((group) => group.key === category);
    if (!group) {
      return;
    }

    const nextKeys =
      selection === "all"
        ? group.options.map((option) => option.key)
        : Array.from(selection, String);
    const otherFilters = selectedFilters.filter(
      (filter) => !filter.startsWith(`${category}:`),
    );
    setSelectedFilters([...otherFilters, ...nextKeys]);
  }

  return (
    <MenuTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <IconButton size="small">
        <FilterIcon />
      </IconButton>

      <Popover placement="bottom start" className="bg-app w-40">
        {isOpen ? (
          <Menu aria-label="Metadata filters" className="w-full">
            {filterGroups.map((group) => {
              const category = group.key;
              const selectedKeys = getFiltersByCategory(
                category,
                selectedFilters,
              );

              return (
                <SubmenuTrigger key={group.key}>
                  <MenuItem id={group.key}>{group.label}</MenuItem>
                  <Popover className="bg-white">
                    <Menu
                      aria-label={`${group.label} filters`}
                      selectionMode="multiple"
                      selectedKeys={selectedKeys}
                      onSelectionChange={(selection) =>
                        handleSelectionChange(category, selection)
                      }
                      className="min-w-32"
                    >
                      {group.options.map((option) => (
                        <MenuCheckboxItem
                          key={option.key}
                          id={option.key}
                          textValue={option.label}
                        >
                          <div
                            className="flex flex-1 items-center justify-between gap-6"
                            onClick={() => setIsOpen(false)}
                          >
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
