import { useLayoutEffect, useMemo, useRef } from "react";

type Fn<ARGS extends any[], R> = (...args: ARGS) => R;

/**
 * # React hook `useEventCallback`
 * Aimed to be easier to use than `useCallback` and solve problems raised in [this ticket](https://github.com/facebook/react/issues/14099).
 *
 * `useEventCallback` doesn't need any dependencies list.
 * The returned function should not be used during rendering.
 *
 * ### Example
 *
 * ```jsx
 * import useEventCallback from 'use-event-callback';
 * const Input = () => {
 *   const [value, setValue] = useState('');
 *   const onChange = useEventCallback((event) => {
 *     setValue(event.target.value);
 *   });
 *   return <input value={value} onChange={onChange} />;
 * }
 */
export const useEventCallback = <A extends any[], R>(
  fn: Fn<A, R>,
): Fn<A, R> => {
  const ref = useRef<Fn<A, R>>(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useMemo(
    () =>
      (...args: A): R => {
        const { current } = ref;
        return current(...args);
      },
    [],
  );
};
