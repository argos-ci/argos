/** Uppercase the first character of a string, leaving the rest untouched. */
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
