/**
 * Whether a value is a plain key-value object (not `null`, not an array).
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
