import { clsx } from "clsx";
import {
  Tab as RACTab,
  TabList as RACTabList,
  TabListProps,
  type TabProps,
} from "react-aria-components";

export function TabList<T extends object>(props: TabListProps<T>) {
  return (
    <RACTabList
      {...props}
      className={clsx("container relative mx-auto", props.className)}
    />
  );
}

export function Tab(props: TabProps) {
  return (
    <RACTab
      {...props}
      className={clsx(
        "text-low hover:text-default aria-selected:text-default data-[focus-visible]:ring-default focus:outline-hidden z-10 -mb-px inline-block cursor-pointer rounded-t border-b-2 border-b-transparent p-3 text-sm font-medium transition aria-selected:cursor-default aria-selected:border-b-current data-[focus-visible]:ring-2",
        props.className,
      )}
    />
  );
}
