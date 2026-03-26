import { use, useRef, useState, type ReactNode } from "react";
import { FunnelPlusIcon, FunnelXIcon } from "lucide-react";

import { Menu, MenuItem, MenuItemIcon } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

import { FilterState, FilterStateContext } from "./FilterState";

type FilterIndicatorMenuProps = {
  isActive: boolean;
  onToggle: () => void;
};

function FilterIndicatorMenu({ isActive, onToggle }: FilterIndicatorMenuProps) {
  const [initialIsActive] = useState(isActive);
  const action = initialIsActive
    ? { icon: FunnelXIcon, label: "Remove filter" }
    : { icon: FunnelPlusIcon, label: "Add filter" };

  return (
    <Menu autoFocus className="text-sm" aria-label="Actions">
      <MenuItem onPress={onToggle}>
        <MenuItemIcon>
          <action.icon />
        </MenuItemIcon>
        {action.label}
      </MenuItem>
    </Menu>
  );
}

type InnerFilterableIndicatorProps = {
  filterKey: string;
  children: ReactNode;
  filterState: FilterState;
};

function InnerFilterableIndicator({
  filterKey,
  filterState,
  children,
}: InnerFilterableIndicatorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const isActive = filterState.active.has(filterKey);

  const toggle = () => {
    filterState.setActive(
      isActive
        ? filterState.active.difference(new Set([filterKey]))
        : filterState.active.union(new Set([filterKey])),
    );
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsOpen(true);
  };

  return (
    <div ref={ref} onContextMenu={handleContextMenu}>
      {children}
      <Popover
        triggerRef={ref}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom start"
      >
        <FilterIndicatorMenu
          isActive={isActive}
          onToggle={() => {
            toggle();
            setIsOpen(false);
          }}
        />
      </Popover>
    </div>
  );
}

type FilterableIndicatorProps = {
  filterKey: string;
  children: ReactNode;
};

export function FilterableIndicator({
  filterKey,
  children,
}: FilterableIndicatorProps) {
  const filterState = use(FilterStateContext);

  if (filterState) {
    return (
      <InnerFilterableIndicator filterKey={filterKey} filterState={filterState}>
        {children}
      </InnerFilterableIndicator>
    );
  }

  return children;
}
