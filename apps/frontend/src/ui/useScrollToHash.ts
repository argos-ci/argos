import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to the element with the ID matching the current URL hash.
 */
export function useScrollToHash() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      return;
    }

    // Delay to ensure DOM is ready
    const el = document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, [hash]);
}
