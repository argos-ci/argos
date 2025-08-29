import { clsx } from "clsx";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import {
  useHref,
  useLocation,
  useMatch,
  useResolvedPath,
} from "react-router-dom";

/**
 * Allow to compute the selected key for a tab link splat.
 * @example
 * const selectedKey = useTabLinkSplat("automations")
 * <TabLinks selectedKey={selectedKey} />
 * <TabPanel id={selectedKey} />
 */
export function useTabLinkSplat(href: string) {
  const resolvedHref = useHref(href);
  const match = useMatch(`${resolvedHref}/*`);
  return match ? resolvedHref : undefined;
}

export function TabsLink(props: {
  children: React.ReactNode;
  className?: string;
  selectedKey?: string;
}) {
  const { selectedKey, ...rest } = props;
  const location = useLocation();
  const resolvedPath = useResolvedPath("");
  return (
    <Tabs
      key={resolvedPath.pathname}
      selectedKey={selectedKey ?? location.pathname}
      {...rest}
    />
  );
}

export function TabLinkList({
  className,
  ...props
}: {
  "aria-label": string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabList
      className={clsx(className, "container relative mx-auto px-4")}
      {...props}
    />
  );
}

export function TabLinkPanel(props: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const { id, ...rest } = props;
  const { pathname } = useLocation();
  return <TabPanel id={id ?? pathname} {...rest} />;
}

export function TabLink({
  href,
  className,
  ...props
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const resolvedHref = useHref(href);
  return (
    <Tab
      key={resolvedHref}
      id={resolvedHref}
      href={resolvedHref}
      className={clsx(
        className,
        "text-low hover:text-default aria-selected:text-default data-[focus-visible]:ring-default focus:outline-hidden z-10 -mb-px inline-block rounded-t border-b-2 border-b-transparent p-3 text-sm font-medium transition aria-selected:cursor-default aria-selected:border-b-current data-[focus-visible]:ring-2",
      )}
      {...props}
    />
  );
}
