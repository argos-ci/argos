import { diffChars } from "diff";

/**
 * Computes the ratio (percentage) of difference between two texts.
 */
export function getDiffScore(base: string, head: string): number {
  const diff = diffChars(base, head);

  let total = 0;
  let unchanged = 0;

  for (const part of diff) {
    total += part.value.length;
    if (!part.added && !part.removed) {
      unchanged += part.value.length;
    }
  }

  if (total === 0) {
    return 0;
  }

  const similarity = unchanged / total;
  return 1 - similarity;
}
