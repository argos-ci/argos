import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import {
  ScreenshotBucket,
  type Build,
  type Screenshot,
} from "@/database/models";

import type { VirtualScreenshotBucket } from "../../types";

/**
 * Merge a bucket with some build diffs to build a virtual screenshot bucket.
 */
export async function mergeBucketWithBuildDiffs(
  baseBucket: ScreenshotBucket | VirtualScreenshotBucket,
  headBuild: Build,
): Promise<VirtualScreenshotBucket> {
  const { screenshotDiffs } = await headBuild.$fetchGraph(
    "screenshotDiffs.[compareScreenshot,baseScreenshot]",
  );

  const baseScreenshots = await (async () => {
    if (baseBucket instanceof ScreenshotBucket) {
      const { screenshots } = await baseBucket.$fetchGraph("screenshots");
      return screenshots;
    }

    return baseBucket.screenshots;
  })();

  const screenshotsByName = baseScreenshots.reduce<Record<string, Screenshot>>(
    (index, screenshot) => {
      index[screenshot.$getBaselineName()] = screenshot;
      return index;
    },
    {},
  );

  for (const diff of screenshotDiffs) {
    const status = await diff.$getDiffStatus();
    switch (status) {
      case "changed":
      case "added": {
        invariant(
          diff.compareScreenshot,
          `A ${status} diff has a compare screenshot`,
        );
        screenshotsByName[diff.compareScreenshot.$getBaselineName()] =
          diff.compareScreenshot;
        break;
      }
      case "removed": {
        invariant(diff.baseScreenshot, "A removed diff has a base screenshot");
        delete screenshotsByName[diff.baseScreenshot.$getBaselineName()];
        break;
      }
      case "unchanged":
      case "retryFailure":
      case "pending":
      case "ignored":
      case "failure": {
        break;
      }
      default:
        assertNever(status);
    }
  }

  return {
    screenshots: Object.values(screenshotsByName),
  };
}
