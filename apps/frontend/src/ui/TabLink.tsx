import { useLayoutEffect, useRef, type ReactNode } from "react";
import { clsx } from "clsx";
import { useHref, useLocation, useResolvedPath } from "react-router";

import { RouterLink } from "./RouterLink";
import { tabClassName, tabListClassName } from "./Tab";
import { useResizeObserver } from "./useResizeObserver";

function stripAfterFirstSegment(pathname: string): string {
  // Do not consider /~/ as a segment
  const match = pathname.match(/^\/[^/~]+/);
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

/**
 * A row of tabs whose selection is the route.
 *
 * Spelled out rather than built on Base UI's `Tabs`: these are links, and the
 * thing below them is the router's outlet, so there is no state for a tab
 * widget to own. Handing `Tabs.Tab` a `render` element it rebuilds every
 * render sent its registration into a loop — React error #185 — and the
 * machinery bought nothing, because the route already decides which one is
 * selected.
 *
 * The roles stay what react-aria produced, which is also what the project
 * spec locates them by: a `tablist` of `tab`s that happen to be anchors.
 */
export function TabsLink(props: { children: ReactNode; className?: string }) {
  return <div {...props} />;
}

/** Scrolls a row of tabs, when it scrolls at all, until the selected one shows. */
function revealSelectedTab(list: HTMLElement) {
  const tab = list.querySelector<HTMLElement>('[aria-selected="true"]');
  if (!tab) {
    return;
  }
  if (tab.offsetLeft < list.scrollLeft) {
    list.scrollLeft = tab.offsetLeft;
  } else if (
    tab.offsetLeft + tab.offsetWidth >
    list.scrollLeft + list.clientWidth
  ) {
    list.scrollLeft = tab.offsetLeft + tab.offsetWidth - list.clientWidth;
  }
}

export function TabLinkList(props: {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const { className, ...rest } = props;
  const { pathname } = useLocation();
  const listRef = useRef<HTMLDivElement>(null);
  // On resize too: a page that opts into the phone layout narrows the row
  // after it first rendered at the desktop width.
  const resizeRef = useResizeObserver(() => {
    if (listRef.current) {
      revealSelectedTab(listRef.current);
    }
  }, listRef);
  useLayoutEffect(() => {
    if (listRef.current) {
      revealSelectedTab(listRef.current);
    }
  }, [pathname]);
  return (
    <div
      ref={resizeRef}
      role="tablist"
      {...rest}
      className={clsx(
        tabListClassName,
        // One row on a phone, scrolled sideways, rather than tabs wrapping onto
        // a second line. The padding and the margin that cancels it keep the
        // selected tab's border over the rule below, as when nothing clips it.
        "max-md:-mb-px max-md:flex max-md:overflow-x-auto max-md:pb-px max-md:[scrollbar-width:none] max-md:*:shrink-0",
        className,
      )}
    />
  );
}

export function TabLinkPanel(props: {
  children: ReactNode;
  className?: string;
}) {
  return <div role="tabpanel" {...props} />;
}

export function TabLink({
  href,
  className,
  ...props
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const resolvedPath = useResolvedPath("");
  const resolvedHref = useHref(href);
  const id = resolvedHref.replace(resolvedPath.pathname, "");
  const selected = id === useSelectedKey();
  return (
    <RouterLink
      role="tab"
      aria-selected={selected}
      // The one you are on is also the current page, which is what the
      // settings navigation next to it says of itself.
      aria-current={selected ? "page" : undefined}
      href={resolvedHref}
      className={clsx(tabClassName, className)}
      {...props}
    />
  );
}
