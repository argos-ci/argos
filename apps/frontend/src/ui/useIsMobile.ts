import { useSyncExternalStore } from "react";

// Below Tailwind's `md` breakpoint, the cutoff between the desktop build
// workspace (fixed sidebars) and the mobile one (sheets and dock).
const QUERY = "(max-width: 767px)";

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
