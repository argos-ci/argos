import { memo, use, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { FilterIcon } from "lucide-react";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { Button } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { MenuRoot, MenuTrigger } from "@/ui/menu-kit";

import { FilterSearchMenu } from "./FilterSearchMenu";
import { FilterStateContext, type FilterState } from "./FilterState";

export const FilterButton = memo(function FilterButton() {
  const state = use(FilterStateContext);
  invariant(state, "Must be used in a filter context");

  if (state.filterGroups.length === 0) {
    return null;
  }

  return <InnerFilterButton state={state} />;
});

// `createHideableComponent` is gone with react-aria: it worked around React
// Aria rendering its collection twice (adobe/react-spectrum#9011), and Base UI
// has no hidden pass to work around.
function InnerFilterButton(props: { state: FilterState }) {
  const { state } = props;
  const [isOpen, setIsOpen] = useState(false);
  const filterHotKey = useBuildHotkey("toggleFilters", () => setIsOpen(true));

  return (
    <MenuRoot open={isOpen} onOpenChange={setIsOpen}>
      <HotkeyTooltip
        keys={filterHotKey.displayKeys}
        description={filterHotKey.description}
      >
        <MenuTrigger>
          <Button variant="ghost" iconOnly size="small">
            <FilterIcon />
          </Button>
        </MenuTrigger>
      </HotkeyTooltip>
      <FilterSearchMenu state={state} />
    </MenuRoot>
  );
}
