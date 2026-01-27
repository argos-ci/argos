import { TabPanel, Tabs } from "react-aria-components";
import { useHref, useLocation, useResolvedPath } from "react-router-dom";

import { Tab } from "./Tab";

function stripAfterFirstSegment(pathname: string): string {
  const match = pathname.match(/^\/[^/]+/);
  return match ? match[0] : pathname;
}

function useSelectedKey() {
  const location = useLocation();
  const resolvedPath = useResolvedPath("");
  const selectedKey = stripAfterFirstSegment(
    location.pathname.replace(resolvedPath.pathname, ""),
  );
  return selectedKey;
}

export function TabsLink(props: {
  children: React.ReactNode;
  className?: string;
}) {
  const resolvedPath = useResolvedPath("");
  const selectedKey = useSelectedKey();
  return (
    <Tabs key={resolvedPath.pathname} selectedKey={selectedKey} {...props} />
  );
}

export function TabLinkPanel(props: {
  children: React.ReactNode;
  className?: string;
}) {
  const selectedKey = useSelectedKey();
  return <TabPanel id={selectedKey} {...props} />;
}

export function TabLink({
  href,
  ...props
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const resolvedPath = useResolvedPath("");
  const resolvedHref = useHref(href);
  const id = resolvedHref.replace(resolvedPath.pathname, "");
  return <Tab key={id} id={id} href={resolvedHref} {...props} />;
}
