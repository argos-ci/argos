import { useEffect, useState } from "react";
import store from "store";

export const useStoreState = <T,>(name: string, initialValue: T) => {
  const [state, setState] = useState<T>(() => {
    const value = store.get(name);
    return value === undefined ? initialValue : value;
  });
  useEffect(() => {
    if (state === null) {
      store.remove(name);
    } else {
      store.set(name, state);
    }
  }, [name, state]);
  return [state, setState] as const;
};
