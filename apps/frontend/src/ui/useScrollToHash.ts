import { useEffect } from "react";

/**
 * Scrolls to the element with the ID matching the current URL hash.
 */
export function useScrollToHash() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      return;
    }

    // Delay to ensure DOM is ready
    const el = document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);
}
