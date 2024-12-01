type OmitUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

/**
 * Filters out undefined values from an object's top-level properties.
 *
 * @example
 * const input = { a: 1, b: undefined, c: "test" };
 * const result = omitUndefinedValues(input); // { a: 1, c: "test" }
 */
export function omitUndefinedValues<T extends Record<string, unknown>>(
  obj: T,
): OmitUndefined<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as OmitUndefined<T>;
}
