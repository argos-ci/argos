/** Clamp a value to a fraction of something: between 0 and 1. */
export function clampFraction(value: number): number {
  return Math.min(1, Math.max(0, value));
}
