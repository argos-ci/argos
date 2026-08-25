import { useEffect } from "react";
import { matchRoutes, type RouteObject } from "react-router";

import { router } from "@/router";
import { cancelIdle, requestIdle } from "@/util/idle";

/**
 * Every page is behind `lazy: () => import(...)`, so clicking a link starts a
 * network round trip before anything can render. This warms those imports
 * ahead of the click, from two signals:
 *
 * - **Intent** — the pointer settles on a link, it takes focus, or a touch
 *   starts on it. That buys the ~200 ms between intent and click.
 * - **Visibility** — a link scrolls into view and the main thread goes idle.
 *   This covers the first click after a page settles, which intent alone only
 *   half-covers.
 *
 * Work is deduplicated per *route*, not per URL, which is what makes the second
 * signal affordable: a list of 50 builds points at one lazy route, so it costs
 * one import, not fifty.
 */

/** Routes whose import has already been kicked off. */
const started = new WeakSet<RouteObject>();

/**
 * How long the pointer must rest on a link before we treat it as intent. Long
 * enough to ignore a pointer crossing the page, short enough to still land well
 * before the click.
 */
const HOVER_INTENT_DELAY = 65;

/**
 * Preloading spends bandwidth on a guess, which is the wrong trade on a metered
 * or slow connection.
 */
function isPreloadWorthwhile(): boolean {
  const connection = navigator.connection;
  if (!connection) {
    return true;
  }
  if (connection.saveData) {
    return false;
  }
  return (
    connection.effectiveType !== "slow-2g" && connection.effectiveType !== "2g"
  );
}

/** Starts the lazy imports for every route matching `pathname`. */
function preloadPath(pathname: string): void {
  const matches = matchRoutes(router.routes, pathname);
  if (!matches) {
    return;
  }
  for (const { route } of matches) {
    // React Router clears `lazy` once a route is loaded, so a missing one here
    // means there is nothing left to fetch.
    if (typeof route.lazy !== "function" || started.has(route)) {
      continue;
    }
    started.add(route);
    // Fire and forget: a failure here is a preload that didn't help, and the
    // real navigation will surface it through the router's own error handling.
    Promise.resolve(route.lazy()).catch(() => {
      started.delete(route);
    });
  }
}

/**
 * The in-app path an event landed on, or null if this isn't a link we route.
 */
function getRoutablePath(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const anchor = target.closest("a");
  if (
    !anchor ||
    !anchor.getAttribute("href") ||
    anchor.origin !== window.location.origin ||
    (anchor.target && anchor.target !== "_self") ||
    anchor.hasAttribute("download")
  ) {
    return null;
  }
  return anchor.pathname;
}

/**
 * Mounted once, near the router. Listens on the document rather than wrapping
 * the link components, so it covers every anchor the app renders — including
 * the ones React Aria builds itself.
 */
export function RoutePreloader() {
  useEffect(() => {
    if (!isPreloadWorthwhile()) {
      return;
    }

    let hoverTimeout: number | undefined;

    const clearHoverTimeout = () => {
      window.clearTimeout(hoverTimeout);
      hoverTimeout = undefined;
    };

    const handlePointerOver = (event: PointerEvent) => {
      const path = getRoutablePath(event.target);
      clearHoverTimeout();
      if (path !== null) {
        hoverTimeout = window.setTimeout(() => {
          preloadPath(path);
        }, HOVER_INTENT_DELAY);
      }
    };

    // Focus and touch are commitments in a way that hovering isn't, so they
    // skip the delay.
    const handleImmediateIntent = (event: Event) => {
      const path = getRoutablePath(event.target);
      if (path !== null) {
        preloadPath(path);
      }
    };

    document.addEventListener("pointerover", handlePointerOver, {
      passive: true,
    });
    document.addEventListener("pointerout", clearHoverTimeout, {
      passive: true,
    });
    document.addEventListener("focusin", handleImmediateIntent, {
      passive: true,
    });
    document.addEventListener("touchstart", handleImmediateIntent, {
      passive: true,
    });

    // Links currently on screen, preloaded once the main thread is free. The
    // observer watches every anchor in the document and keeps up with the ones
    // React adds and removes as routes change.
    let idleHandle: number | undefined;
    const visible = new Set<string>();

    const flushVisible = () => {
      idleHandle = undefined;
      for (const path of visible) {
        preloadPath(path);
      }
      visible.clear();
    };

    const scheduleFlush = () => {
      if (idleHandle === undefined && visible.size > 0) {
        idleHandle = requestIdle(flushVisible);
      }
    };

    const intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const path = getRoutablePath(entry.target);
          if (path !== null) {
            visible.add(path);
          }
          intersectionObserver.unobserve(entry.target);
        }
      }
      scheduleFlush();
    });

    const observeAnchors = (root: ParentNode) => {
      for (const anchor of root.querySelectorAll("a[href]")) {
        intersectionObserver.observe(anchor);
      }
    };

    observeAnchors(document);

    const mutationObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) {
            if (node.matches("a[href]")) {
              intersectionObserver.observe(node);
            }
            observeAnchors(node);
          }
        }
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearHoverTimeout();
      if (idleHandle !== undefined) {
        cancelIdle(idleHandle);
      }
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("pointerout", clearHoverTimeout);
      document.removeEventListener("focusin", handleImmediateIntent);
      document.removeEventListener("touchstart", handleImmediateIntent);
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return null;
}
