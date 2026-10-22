import { useLayoutEffect } from "react";
import { invariant } from "@argos/util/invariant";
import { useMatches } from "react-router";

/**
 * Set on a route once its page is laid out for phones. It switches the whole
 * screen, navbar included, for every route under it.
 */
export const responsiveRouteHandle = { responsive: true };

/**
 * Set on a route under a responsive one that is not laid out for phones yet:
 * the deepest route that says decides.
 */
export const desktopRouteHandle = { responsive: false };

function getResponsiveHandleValue(handle: unknown) {
  return typeof handle === "object" &&
    handle !== null &&
    "responsive" in handle &&
    typeof handle.responsive === "boolean"
    ? handle.responsive
    : null;
}

/**
 * A page renders at the device width on a phone once a route it matches sets
 * `responsiveRouteHandle`. The others (the build page, a test's page, a shared
 * media) keep the desktop width declared in `index.html`, scaled down: tiny,
 * but whole, where the device width would cut a layout nobody designed for it.
 */
export function ResponsiveViewport() {
  const matches = useMatches();
  const responsive =
    matches
      .map((match) => getResponsiveHandleValue(match.handle))
      .findLast((value) => value !== null) ?? false;

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
    return () => {
      meta.content = desktopContent;
    };
  }, [responsive]);

  return null;
}
