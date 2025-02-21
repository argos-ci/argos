import { useCallback } from "react";

import { useLiveRef } from "./useLiveRef";

/**
 * Listen resize of an element.
 * You can pass a callback function that will be called whenever the element is resized.
 * The callback function will receive a ResizeObserverEntry as an argument.
 */
export function useResizeObserver(
  callback: (entry: ResizeObserverEntry) => void,
  ref?: React.Ref<HTMLElement>,
) {
  const callbackRef = useLiveRef(callback);
  return useCallback(
    (element: HTMLElement | null) => {
      // Handle ref forwarding.
      if (ref) {
        if (typeof ref === "function") {
          ref(element);
        } else {
          ref.current = element;
        }
      }

      if (!element) {
        return undefined;
      }

      let req: number;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          req = window.requestAnimationFrame(() => {
            callbackRef.current(entry);
          });
        }
      });
      observer.observe(element);
      return () => {
        observer.disconnect();
        if (req) {
          window.cancelAnimationFrame(req);
        }
      };
    },
    [callbackRef, ref],
  );
}
