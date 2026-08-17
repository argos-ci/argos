import type { ComponentPropsWithRef, ReactNode } from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { clsx } from "clsx";

import { getButtonClassName } from "./Button";

/**
 * A set of tabs and the panels they switch between.
 *
 * Only for tabs that swap content in place. A row of links that happens to
 * look like tabs is navigation, and lives in `TabLink`.
 */
export function Tabs(props: {
  children: ReactNode;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  className?: string;
}) {
  return <BaseTabs.Root {...props} />;
}

export function TabList(
  props: ComponentPropsWithRef<"div"> & { "aria-label"?: string },
) {
  return (
    <BaseTabs.List
      {...props}
      className={clsx(tabListClassName, props.className)}
    />
  );
}

export function TabPanel(
  props: ComponentPropsWithRef<"div"> & { value: string },
) {
  return <BaseTabs.Panel {...props} />;
}

/** How a tab looks. Shared with `TabLink`, which is one wearing a link. */
export const tabClassName =
  "text-low hover:text-default aria-selected:text-default focus-visible:ring-default z-10 -mb-px inline-block cursor-pointer rounded-t border-b-2 border-b-transparent p-3 text-sm font-medium transition focus:outline-hidden aria-selected:cursor-default aria-selected:border-b-current focus-visible:ring-2";

/** The row a set of tabs sits in. Shared with `TabLink`'s own list. */
export const tabListClassName = "relative container mx-auto";

export function Tab(props: BaseTabs.Tab.Props & { value: string }) {
  return (
    <BaseTabs.Tab {...props} className={clsx(tabClassName, props.className)} />
  );
}

/**
 * A tab that sits in a row of controls rather than under a page title: it wears
 * the secondary button surface, and fills in when selected — which the `on`
 * variant reads off its `aria-selected`.
 */
export function PillTab(props: BaseTabs.Tab.Props & { value: string }) {
  return (
    <BaseTabs.Tab
      {...props}
      className={clsx(
        getButtonClassName({ variant: "secondary", size: "small" }),
        props.className,
      )}
    />
  );
}
