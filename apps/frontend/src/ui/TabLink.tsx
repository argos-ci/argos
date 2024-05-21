import { clsx } from "clsx";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { useHref, useLocation } from "react-router-dom";

export function TabsLink(props: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pathname } = useLocation();
  return <Tabs selectedKey={pathname} {...props} />;
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
  href = useHref(href);
  return (
    <Tab
      id={href}
      className={clsx(
        className,
        "text-low hover:text aria-selected:text focus-visible:ring-primary z-10 -mb-px inline-block border-b-2 border-b-transparent p-3 text-sm font-medium transition aria-selected:cursor-default aria-selected:border-b-current",
      )}
      href={href}
      {...props}
    />
  );
}
