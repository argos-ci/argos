import { clsx } from "clsx";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { useHref, useLocation, useResolvedPath } from "react-router-dom";

export function TabsLink(props: {
  children: React.ReactNode;
  className?: string;
}) {
  const location = useLocation();
  const resolvedPath = useResolvedPath("");
  return (
    <Tabs
      key={resolvedPath.pathname}
      selectedKey={location.pathname}
      {...props}
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
}) {
  const { pathname } = useLocation();
  return <TabPanel id={pathname} {...props} />;
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
