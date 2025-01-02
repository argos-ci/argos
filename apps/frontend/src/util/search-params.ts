import { Key } from "react-aria";
import { useSearchParams } from "react-router-dom";

import { useEventCallback } from "@/ui/useEventCallback";

/**
 * A hook for managing a single search param.
 */
export function useSingleSearchParamState(
  name: string,
): [string | null, (value: string | null) => void, boolean] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(name) ?? null;
  const setValue = useEventCallback((value: string | null) => {
    setSearchParams((params) => {
      const newParams = new URLSearchParams(params);
      if (!value) {
        newParams.delete(name);
      } else {
        newParams.set(name, value);
      }
      return newParams;
    });
  });
  const isDirty = value !== null;
  return [value, setValue, isDirty] as const;
}

/**
 * A hook for managing a multiple search params.
 */
export function useMultipleSearchParamsState<T extends Key>(
  name: string,
  options?: {
    defaultValue?: Set<T>;
    format?: (value: Set<T>) => string;
    parse?: (value: string) => Set<T>;
  },
): [Set<T>, (value: Set<T>) => void, boolean] {
  const {
    defaultValue = new Set<T>(),
    format = (value: Set<T>) => Array.from(value).join(","),
    parse = (value: string) =>
      new Set<T>(value ? (value.split(",") as T[]) : []),
  } = options ?? {};
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.has(name)
    ? parse(searchParams.get(name) ?? "")
    : defaultValue;
  const checkIsDirty = (value: Set<T>) =>
    value.size !== defaultValue.size ||
    value.intersection(defaultValue).size !== value.size;
  const setValue = useEventCallback((value: Set<T>) => {
    setSearchParams((params) => {
      const newParams = new URLSearchParams(params);
      if (!checkIsDirty(value)) {
        newParams.delete(name);
      } else {
        newParams.set(name, format(value));
      }
      return newParams;
    });
  });
  const isDirty = checkIsDirty(value);
  return [value, setValue, isDirty] as const;
}
