import { TabPanel, Tabs } from "react-aria-components";
import {
  useHref,
  useLocation,
  useMatch,
  useResolvedPath,
} from "react-router-dom";

import { Tab } from "./Tab";

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
  ...props
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const resolvedHref = useHref(href);
  return (
    <Tab key={resolvedHref} id={resolvedHref} href={resolvedHref} {...props} />
  );
}
