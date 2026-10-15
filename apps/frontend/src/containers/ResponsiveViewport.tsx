import { useLayoutEffect } from "react";
import { invariant } from "@argos/util/invariant";
import { useMatches } from "react-router";

/**
 * Set on a route once its page is laid out for phones. Any matched route
 * setting it switches the whole screen, navbar included.
 */
export const responsiveRouteHandle = { responsive: true };

function checkIsResponsiveHandle(handle: unknown) {
  return (
    typeof handle === "object" &&
    handle !== null &&
    "responsive" in handle &&
    handle.responsive === true
  );
}

/**
 * Pages move to phones one at a time. Until a page opts in, a phone keeps
 * rendering it at the desktop width declared in `index.html`, scaled down:
 * tiny, but whole, where the device width would cut a layout nobody
 * designed for it.
 */
export function ResponsiveViewport() {
  const matches = useMatches();
  const responsive = matches.some((match) =>
    checkIsResponsiveHandle(match.handle),
  );

  useLayoutEffect(() => {
    if (!responsive) {
      return undefined;
    }
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="viewport"]',
    );
    invariant(meta, "index.html declares the viewport");
    const desktopContent = meta.content;
    meta.content = "width=device-width, initial-scale=1";
    // Read by the `phone-layout:` variant.
    document.documentElement.dataset.phoneLayout = "";
    return () => {
      meta.content = desktopContent;
      delete document.documentElement.dataset.phoneLayout;
    };
  }, [responsive]);

  return null;
}
