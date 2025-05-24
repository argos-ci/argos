import { useEffect, useState } from "react";

function getViewportSize() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
}

/**
 * Returns the current viewport size.
 * This hook listens to the window resize event and updates the size accordingly.
 */
export default function useViewportSize() {
  const [viewportSize, setViewportSize] = useState(getViewportSize());

  useEffect(() => {
    function handleResize() {
      setViewportSize(getViewportSize());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return viewportSize;
}
