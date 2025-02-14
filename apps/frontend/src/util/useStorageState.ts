import { useCallback, useState } from "react";

import * as storage from "@/util/storage";

export function useStorageState<S>(
  storageKey: string,
  initialState: S | (() => S),
) {
  const [value, setValue] = useState<S>(() => {
    const storedValue = storage.getItem(storageKey);
    if (storedValue) {
      return JSON.parse(storedValue);
    }
    if (typeof initialState === "function") {
      return (initialState as () => S)();
    }
    return initialState;
  });
  const setAndStoreValue = useCallback<typeof setValue>(
    (value) => {
      setValue((prevValue) => {
        const nextValue =
          typeof value === "function"
            ? (value as (prevState: S) => S)(prevValue)
            : value;
        storage.setItem(storageKey, JSON.stringify(nextValue));
        return nextValue;
      });
    },
    [setValue, storageKey],
  );
  return [value, setAndStoreValue] as const;
}
