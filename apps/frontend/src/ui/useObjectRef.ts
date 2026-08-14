import { useCallback, useMemo, useRef, type Ref, type RefObject } from "react";

/**
 * Turn a forwarded ref — callback or object — into one this component can also
 * read from.
 *
 * `mergeRefs` in `@/util/merge-refs` solves the neighbouring problem: it fans
 * one element out to several refs, but returns a callback, so the component
 * cannot read the node back. This returns a ref *object* and still forwards to
 * whatever it was given.
 *
 * The returned object is stable and its `current` is a setter, so assigning to
 * it is what forwards — the caller just passes it as `ref` and reads
 * `ref.current` like any other. Cleanups follow React 19's convention: a
 * callback ref that returns a function has that function called on detach,
 * and one that does not is called with `null` instead.
 */
export function useObjectRef<T>(
  forwardedRef?: Ref<T> | null,
): RefObject<T | null> {
  const objectRef = useRef<T | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  const attach = useCallback(
    (instance: T) => {
      if (typeof forwardedRef === "function") {
        const cleanup = forwardedRef(instance);
        return () => {
          if (typeof cleanup === "function") {
            cleanup();
          } else {
            forwardedRef(null);
          }
        };
      }
      if (forwardedRef) {
        // React types object refs as readonly, but assigning to a forwarded
        // one is the whole point here — same cast as `util/merge-refs.ts`.
        const objectForwardedRef = forwardedRef as { current: T | null };
        objectForwardedRef.current = instance;
        return () => {
          objectForwardedRef.current = null;
        };
      }
      return undefined;
    },
    [forwardedRef],
  );

  return useMemo(
    () => ({
      get current() {
        return objectRef.current;
      },
      set current(value: T | null) {
        objectRef.current = value;
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = undefined;
        }
        if (value != null) {
          cleanupRef.current = attach(value);
        }
      },
    }),
    [attach],
  );
}
