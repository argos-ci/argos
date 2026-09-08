import { useSyncExternalStore } from "react";

// The cutoff between the desktop build workspace (fixed sidebars) and the
// mobile one (sheets and dock). Width alone (Tailwind's `md`) misses phones
// held in landscape — wider than 767px but still phones — so a coarse
// pointer with a short viewport also qualifies. Tablets keep the desktop
// workspace: even in landscape their height clears 500px.
const QUERY = "(max-width: 767px), ((pointer: coarse) and (max-height: 500px))";

function subscribe(callback: () => void) {
  const mediaQuery = window.matchMedia(QUERY);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

// A phone held in landscape: the mobile workspace applies, but stacking its
// chrome would leave the snapshot a sliver, so the layout goes to rails.
const SHORT_QUERY = "(max-height: 500px)";

function subscribeShort(callback: () => void) {
  const mediaQuery = window.matchMedia(SHORT_QUERY);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getShortSnapshot() {
  return window.matchMedia(SHORT_QUERY).matches;
}

export function useIsShortViewport() {
  return useSyncExternalStore(subscribeShort, getShortSnapshot, () => false);
}
