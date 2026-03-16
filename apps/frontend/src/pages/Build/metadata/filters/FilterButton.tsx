import { useState } from "react";
import { FilterIcon } from "lucide-react";
import type { Selection } from "react-aria-components";

import { IconButton } from "@/ui/IconButton";
import { Menu, MenuItem, MenuTrigger, SubmenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

import {
  getMetadataCategoryDefinition,
  type MetadataCategory,
} from "../metadataCategories";
import { MetadataCategoryMenu } from "./MetadataCategoryMenu";
import type { MetadataFilterContextValue } from "./MetadataFilterState";
import {
  getFilterKey,
  groupTagsByCategory,
  resolveSelectionKeys,
  updateCategoryFilters,
} from "./metadataFilterUtils";

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
      label: getMetadataCategoryDefinition(category).label,
      tags: categoryTags,
    }),
  );

  function handleSelectionChange(
    category: MetadataCategory,
    selection: Selection,
  ) {
    const categoryTags = tagsByCategory.get(category);
    if (!categoryTags) {
      return;
    }

    const allKeys = categoryTags.map((tag) =>
      getFilterKey(tag.category, tag.value),
    );
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
                      category={category}
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
