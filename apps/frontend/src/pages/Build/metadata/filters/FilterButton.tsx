import { useRef, useState } from "react";
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

export function FilterButton({
  tags,
  selectedFilters,
  setSelectedFilters,
}: MetadataFilterContextValue) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const filterHotKey = useBuildHotkey(
    "toggleFilters",
    () => {
      buttonRef.current?.click();
    },
    { enabled: tags.length > 0 },
  );

  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  const tagsByCategory = groupTagsByCategory(tags);
  const categoryGroups = getCategoryGroups(tagsByCategory);

  function handleSelectionChange(
    category: MetadataCategory,
    selection: Selection,
  ) {
    const categoryTags = tagsByCategory.get(category);
    if (!categoryTags) {
      return;
    }

    const allKeys = categoryTags.map((tag) => getFilterKey(tag));
    const nextKeys = resolveSelectionKeys(selection, allKeys);
    setSelectedFilters(
      updateCategoryFilters(category, nextKeys, selectedFilters),
    );
  }

  return (
    <MenuTrigger
      // Using isOpen force the submenu to be rendered after menu is
      // fully rendered and avoid a page crash due to a bug in react-aria
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (open) {
          setHasBeenOpened(true);
        }
        setIsOpen(open);
      }}
    >
      <HotkeyTooltip
        keys={filterHotKey.displayKeys}
        description={filterHotKey.description}
        disabled={isOpen}
      >
        <IconButton ref={buttonRef} size="small">
          <FilterIcon />
        </IconButton>
      </HotkeyTooltip>

      <Popover placement="bottom start" className="bg-app min-w-40">
        {/* Prevent the popover to blink empty */}
        {hasBeenOpened ? (
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
        ) : null}
      </Popover>
    </MenuTrigger>
  );
}
