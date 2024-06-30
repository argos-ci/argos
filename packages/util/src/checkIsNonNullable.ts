/**
 * Filter function to exclude `null` values
 */
export function checkIsNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}
