import { useState } from "react";
import { FilterIcon } from "lucide-react";
import type { Selection } from "react-aria-components";

import { IconButton } from "@/ui/IconButton";
import { Menu, MenuItem, MenuTrigger, SubmenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

import { MetadataCategoryMenu } from "./MetadataCategoryMenu";
import {
  groupTagsByCategory,
  resolveSelectionKeys,
  updateCategoryFilters,
  type MetadataFilterContextValue,
} from "./MetadataFilterState";

export const FilterButton = ({
  tags,
  selectedFilters,
  setSelectedFilters,
}: MetadataFilterContextValue) => {
  const [isOpen, setIsOpen] = useState(false);
  const tagsByCategory = groupTagsByCategory(tags);

  const filterGroups = Array.from(tagsByCategory.entries()).map(
    ([category, categoryTags]) => ({
      key: category,
      label: category,
      tags: categoryTags,
    }),
  );

  function handleSelectionChange(category: string, selection: Selection) {
    const group = filterGroups.find((group) => group.key === category);
    if (!group) {
      return;
    }
    const allKeys = group.tags.map((tag) => `${tag.category}:${tag.value}`);
    const nextKeys = resolveSelectionKeys(selection, allKeys);
    setSelectedFilters(
      updateCategoryFilters(category, nextKeys, selectedFilters),
    );
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
              const selectedKeys = new Set(
                selectedFilters.filter((f) => f.startsWith(`${category}:`)),
              );

              return (
                <SubmenuTrigger key={group.key}>
                  <MenuItem id={group.key}>{group.label}</MenuItem>
                  <Popover className="bg-white">
                    <MetadataCategoryMenu
                      category={group.label}
                      tags={group.tags}
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
        ) : null}
      </Popover>
    </MenuTrigger>
  );
};
