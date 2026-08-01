import { clsx } from "clsx";
import {
  Tab as RACTab,
  TabList as RACTabList,
  TabListProps,
  type TabProps,
} from "react-aria-components";

import { getButtonClassName } from "./Button";

export function TabList<T extends object>(props: TabListProps<T>) {
  return (
    <RACTabList
      {...props}
      className={clsx("relative container mx-auto", props.className)}
    />
  );
}

export function Tab(props: TabProps) {
  return (
    <RACTab
      {...props}
      className={clsx(
        "text-low hover:text-default aria-selected:text-default data-focus-visible:ring-default z-10 -mb-px inline-block cursor-pointer rounded-t border-b-2 border-b-transparent p-3 text-sm font-medium transition focus:outline-hidden aria-selected:cursor-default aria-selected:border-b-current data-focus-visible:ring-2",
        props.className,
      )}
    />
  );
}

/**
 * A tab that sits in a row of controls rather than under a page title: it wears
 * the secondary button surface, and fills in when selected.
 */
export function PillTab(
  props: TabProps & {
    ref?: React.Ref<HTMLDivElement>;
  },
) {
  return (
    <RACTab
      {...props}
      className={clsx(
        getButtonClassName({ variant: "secondary", size: "small" }),
        "cursor-pointer",
        // Selected reads like a pressed button — the same fill, so the two are
        // never a shade apart.
        "data-selected:bg-raised-active data-selected:data-hovered:bg-raised-active data-selected:text-default data-selected:cursor-default",
        props.className,
      )}
    />
  );
}
