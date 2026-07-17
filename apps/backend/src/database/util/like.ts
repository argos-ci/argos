/**
 * Escape a string to be interpolated inside a SQL LIKE / ILIKE pattern,
 * so that `%`, `_` and `\` are matched literally.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
