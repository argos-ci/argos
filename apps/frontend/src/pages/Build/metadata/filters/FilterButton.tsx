import { useState } from "react";
import { invariant } from "@argos/util/invariant";
import { createHideableComponent } from "@react-aria/collections";
import { FilterIcon } from "lucide-react";
import type { Selection } from "react-aria-components";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
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
  MetadataTag,
  resolveSelectionKeys,
  updateCategoryFilters,
} from "./metadataFilterUtils";

type CategoryGroup = {
  category: MetadataCategory;
  label: string;
  tags: MetadataTag[];
};

function getCategoryGroups(
  tagsByCategory: Map<MetadataCategory, MetadataTag[]>,
): CategoryGroup[] {
  return Array.from(tagsByCategory.entries())
    .map(([category, tags]) => ({
      category,
      label: getMetadataCategoryDefinition(category).label,
      tags,
    }))
    .filter((group) => group.tags.length > 1);
}

// This is needed because of https://github.com/adobe/react-spectrum/issues/9011
export const FilterButton = createHideableComponent(function FilterButton({
  tags,
  selectedFilters,
  setSelectedFilters,
}: MetadataFilterContextValue) {
  const [isOpen, setIsOpen] = useState(false);
  const filterHotKey = useBuildHotkey(
    "toggleFilters",
    () => {
      setIsOpen(true);
    },
    { enabled: tags.length > 0 },
  );

  const tagsByCategory = groupTagsByCategory(tags);
  const categoryGroups = getCategoryGroups(tagsByCategory);

  function handleSelectionChange(
    category: MetadataCategory,
    selection: Selection,
  ) {
    const categoryTags = tagsByCategory.get(category);
    invariant(categoryTags, `No tags found for category: ${category}`);

    const allKeys = categoryTags.map((tag) => getFilterKey(tag));
    const nextKeys = resolveSelectionKeys(selection, allKeys);
    setSelectedFilters(
      updateCategoryFilters(category, nextKeys, selectedFilters),
    );
  }

  return (
    <MenuTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <HotkeyTooltip
        keys={filterHotKey.displayKeys}
        description={filterHotKey.description}
      >
        <IconButton size="small">
          <FilterIcon />
        </IconButton>
      </HotkeyTooltip>

      <Popover placement="bottom start" className="bg-app min-w-40">
        <Menu autoFocus aria-label="Metadata filters" className="w-full">
          {categoryGroups.map(({ category, label, tags }) => {
            const selectedKeys = new Set(
              selectedFilters.filter((f) => f.startsWith(`${category}:`)),
            );
            const Icon = getMetadataCategoryDefinition(category).icon;

            return (
              <SubmenuTrigger key={category} delay={0}>
                <MenuItem id={category}>
                  <div className="grid grid-cols-[1em_auto] items-center gap-2">
                    <Icon className="size-4" />
                    <div>{label}</div>
                  </div>
                </MenuItem>
                <Popover>
                  <MetadataCategoryMenu
                    category={category}
                    tags={tags}
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
      </Popover>
    </MenuTrigger>
  );
});
