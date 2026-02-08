/**
 * Computes a binary difference score between two texts.
 *
 * Returns:
 * - 0 if the texts are identical
 * - 1 if the texts differ
 */
export function getDiffScore(base: string, head: string): number {
  return base === head ? 0 : 1;
}
