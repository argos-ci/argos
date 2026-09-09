import {
  cloneElement,
  use,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { FunnelPlusIcon, FunnelXIcon } from "lucide-react";

import { Menu, MenuItem, MenuRoot, MenuTrigger } from "@/ui/menu-kit";

import { FilterStateContext } from "./FilterState";

/**
 * The right-click menu behind anything naming one value of a filter category:
 * a tag chip in the metadata panel, a segment of a variant switcher.
 *
 * Renders its child as the trigger and adds no element of its own, so it can
 * sit inside a button group without squaring the corners its sibling selectors
 * round off. A trigger and not a `Popover` given an `anchor`: a menu is itself
 * a popup, and one nested inside another popover has no anchor of its own —
 * it lands at `opacity: 0` in the top-left corner.
 */
export function FilterContextMenu(props: {
  filterKey: string;
  /**
   * Where to go once the filter is added.
   *
   * A control naming a value the snapshot on screen does not carry — the
   * sibling segments of a variant switcher — would otherwise filter that very
   * snapshot out of the list, leaving the viewer on a diff no row points at.
   * Following the value is what keeps "filter on 375px" and "show me 375px"
   * the same sentence.
   */
  onFilterAdded?: () => void;
  children: ReactElement;
}) {
  const { filterKey, onFilterAdded, children, ...rest } = props;
  const filterState = use(FilterStateContext);
  const [isOpen, setIsOpen] = useState(false);

  // A key no group holds is a value the filter menus never offer — a color
  // scheme every snapshot leaves unset, which the switcher still resolves to
  // Light to display it. Handing it to `setActive` would give the chips a key
  // they cannot group.
  const isFilterable = Boolean(
    filterState?.filterGroups.some((group) => group.filterKeys.has(filterKey)),
  );

  const isActive = Boolean(filterState?.active.has(filterKey));
  // The row must not flip under the pointer as the menu animates out, so it is
  // held at what it read while the menu was open — and re-read on the next
  // open, or a second right-click still offers to remove a filter already gone.
  const [rowIsActive, setRowIsActive] = useState(isActive);
  if (isOpen && rowIsActive !== isActive) {
    setRowIsActive(isActive);
  }

  if (!filterState || !isFilterable) {
    // Cloned rather than returned bare: `rest` is the outer tooltip's trigger
    // props, and dropping them takes the tooltip down with the menu.
    return cloneElement(children, rest);
  }

  return (
    <MenuRoot open={isOpen} onOpenChange={setIsOpen}>
      {/* `rest` carries whatever an outer trigger — a tooltip's — put on this
          element, down to the control it ends up rendering. */}
      <MenuTrigger
        {...rest}
        // Opened by the right button and only by it: the left one belongs to
        // the control underneath, which for a switcher segment is a link to
        // the sibling it names.
        onClick={(event) => event.preventBaseUIHandler?.()}
        onContextMenu={(event) => {
          event.preventDefault();
          setIsOpen(true);
        }}
      >
        {children}
      </MenuTrigger>
      <FilterIndicatorMenu
        isActive={rowIsActive}
        onToggle={() => {
          // Adding rather than replacing: a reviewer narrowing to two viewports
          // builds the set up one right-click at a time, and replacing would
          // undo the previous one.
          filterState.setActive(
            isActive
              ? filterState.active.difference(new Set([filterKey]))
              : filterState.active.union(new Set([filterKey])),
          );
          if (!isActive) {
            onFilterAdded?.();
          }
          setIsOpen(false);
        }}
      />
    </MenuRoot>
  );
}

function FilterIndicatorMenu(props: {
  isActive: boolean;
  onToggle: () => void;
}) {
  const { isActive, onToggle } = props;
  const action = isActive
    ? { icon: FunnelXIcon, label: "Remove from filters" }
    : { icon: FunnelPlusIcon, label: "Add to filters" };

  return (
    // One fixed row: a search field over it, and a menu three times wider than
    // it reads, are both furniture.
    <Menu className="text-sm" aria-label="Actions" search={false} fitContent>
      <MenuItem icon={<action.icon />} onAction={onToggle}>
        {action.label}
      </MenuItem>
    </Menu>
  );
}

/** The same menu for a control that cannot itself be the trigger. */
export function FilterableIndicator(props: {
  filterKey: string;
  children: ReactNode;
}) {
  const { filterKey, children } = props;
  return (
    <FilterContextMenu filterKey={filterKey}>
      <div className="min-w-0">{children}</div>
    </FilterContextMenu>
  );
}
