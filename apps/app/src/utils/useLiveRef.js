import { useLayoutEffect, useRef } from "react";

export const useLiveRef = (value) => {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
};
