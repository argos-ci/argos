import type Objection from "objection";

import { ScreenshotDiff } from "../models";

/**
 * Sort screenshot diffs for a build in a meaningful order.
 */
export function sortScreenshotDiffsForBuild(
  qb: Objection.QueryBuilder<ScreenshotDiff, ScreenshotDiff[]>,
) {
  return qb
    .orderByRaw(ScreenshotDiff.sortDiffByStatus)
    .orderBy("screenshot_diffs.group", "asc", "last")
    .orderBy("screenshot_diffs.score", "desc", "last")
    .orderBy("compareScreenshot.name", "asc")
    .orderBy("baseScreenshot.name", "asc")
    .orderBy("screenshot_diffs.id", "asc");
}
