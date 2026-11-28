/** The statuses that put a screenshot in front of a reviewer. */
const REVIEWED_STATUSES: readonly string[] = [
  "failure",
  "changed",
  "added",
  "removed",
];

/**
 * Whether a screenshot diff of `status` waits for a reviewer. In a subset
 * build, a removed screenshot was only left out of the run: it is skipped,
 * not reviewed.
 */
export function checkStatusNeedsReview(
  status: string,
  context: { isSubsetBuild: boolean },
): boolean {
  if (context.isSubsetBuild && status === "removed") {
    return false;
  }
  return REVIEWED_STATUSES.includes(status);
}
