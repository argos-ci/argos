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
