import { Combobox } from "@base-ui/react/combobox";
import { clsx } from "clsx";
import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { parseAsString } from "nuqs";

import {
  getMenuItemClassName,
  menuListClassName,
  menuTextClassName,
} from "@/ui/menuStyle";
import {
  popupAnimationClassName,
  popupSurfaceClassName,
  popupZIndexClassName,
} from "@/ui/popupSurface";
import {
  getSelectButtonClassName,
  selectButtonValueClassName,
} from "@/ui/Select";

function getBuildNameLabel(buildName: string) {
  if (buildName === "") {
    return "All builds";
  }
  return buildName;
}

export const BuildNameFilterParser = parseAsString;

/**
 * Picks one build name, with a search field for projects that have many.
 *
 * A combobox rather than a `Select`: it is the only control in the app that
 * pairs a value with a query, which is exactly the distinction Base UI draws
 * between the two namespaces. It wears the select's control and the shared
 * menu style, so it reads as a select regardless.
 */
export function BuildNameFilter(props: {
  buildNames: string[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const value = props.value ?? "";
  const names = ["", ...props.buildNames];
  return (
    <Combobox.Root
      items={names}
      value={value}
      onValueChange={(next) => props.onChange(next ? String(next) : null)}
      itemToStringLabel={getBuildNameLabel}
    >
      <Combobox.Trigger
        aria-label="Build name"
        className={clsx(
          getSelectButtonClassName({ size: "sm" }),
          "min-w-[8em]",
        )}
      >
        <span className={selectButtonValueClassName}>
          {getBuildNameLabel(value)}
        </span>
        <Combobox.Icon
          render={
            <span aria-hidden="true" className="shrink-0">
              <ChevronDownIcon className="size-4" />
            </span>
          }
        />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner
          sideOffset={4}
          className={clsx(popupZIndexClassName, "max-w-(--available-width)")}
        >
          <Combobox.Popup
            className={clsx(
              popupSurfaceClassName,
              popupAnimationClassName,
              "flex-col overflow-hidden outline-hidden select-none",
            )}
          >
            <div className="relative flex shrink-0 items-center border-b px-3 py-2">
              <SearchIcon
                aria-hidden
                className="text-placeholder mr-2 size-4 shrink-0"
              />
              <Combobox.Input
                placeholder="Find build name…"
                className="text-menu placeholder:text-placeholder w-full bg-transparent outline-none"
              />
            </div>
            <Combobox.Empty className={menuTextClassName}>
              No build names found
            </Combobox.Empty>
            <Combobox.List className={menuListClassName}>
              {(name: string) => (
                <Combobox.Item
                  key={name}
                  value={name}
                  className={getMenuItemClassName()}
                >
                  {getBuildNameLabel(name)}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
