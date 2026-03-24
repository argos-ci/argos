import { memo, use, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { createHideableComponent } from "@react-aria/collections";
import { FilterIcon } from "lucide-react";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuTrigger,
  SubmenuTrigger,
} from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

import { FilterCategoryMenu } from "./FilterCategoryMenu";
import { FilterStateContext, type FilterState } from "./FilterState";
import { getFilterCategoryDefinition } from "./util";

export const FilterButton = memo(function FilterButton() {
  const state = use(FilterStateContext);
  invariant(state, "Must be used in a filter context");

  if (state.filterGroups.length === 0) {
    return null;
  }

  return <InnerFilterButton state={state} />;
});

// This is needed because of https://github.com/adobe/react-spectrum/issues/9011
const InnerFilterButton = createHideableComponent(
  function InnerFilterButton(props: { state: FilterState }) {
    const { state } = props;
    const [isOpen, setIsOpen] = useState(false);
    const filterHotKey = useBuildHotkey("toggleFilters", () => setIsOpen(true));

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
          <Menu autoFocus aria-label="Filters" className="w-full">
            {state.filterGroups.map((filterGroup) => {
              const { category } = filterGroup;
              const categoryDef = getFilterCategoryDefinition(category);
              return (
                <SubmenuTrigger key={category} delay={0}>
                  <MenuItem id={category}>
                    <MenuItemIcon>
                      <categoryDef.icon />
                    </MenuItemIcon>
                    {categoryDef.label}
                  </MenuItem>
                  <Popover>
                    <FilterCategoryMenu
                      state={state}
                      filterGroup={filterGroup}
                      className="min-w-32"
                    />
                  </Popover>
                </SubmenuTrigger>
              );
            })}
          </Menu>
        </Popover>
      </MenuTrigger>
    );
  },
);
