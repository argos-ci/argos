import { use, type Usable } from "react";
import { invariant } from "@argos/util/invariant";

/**
 * A hook that returns a non-nullable value from a usable.
 */
export function useNonNullable<T>(
  usable: Usable<T>,
  message = "Value must not be null or undefined",
): NonNullable<T> {
  const value = use(usable);
  invariant(value !== null && value !== undefined, message);
  return value;
}
