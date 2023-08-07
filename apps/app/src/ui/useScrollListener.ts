import { RefObject, useEffect, useLayoutEffect, useRef } from "react";

export const useScrollListener = (
  listener: (event: Event) => void,
  elementRef: RefObject<HTMLElement>,
) => {
  const listenerRef = useRef(listener);
  useLayoutEffect(() => {
    listenerRef.current = listener;
  });
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    let ticking = false;
    const listener = (ev: Event) => {
      if (ticking) return;
      requestAnimationFrame(() => {
        listenerRef.current(ev);
        ticking = false;
      });
      ticking = true;
    };
    element.addEventListener("scroll", listener, { passive: true });
    return () => {
      element.removeEventListener("scroll", listener);
    };
  }, [elementRef]);
};
