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
  await headBuild.$fetchGraph(
    "screenshotDiffs.[compareScreenshot,baseScreenshot]",
  );
  invariant(headBuild.screenshotDiffs, "Relation `screenshotDiffs` not loaded");

  const baseScreenshots = await (async () => {
    if (baseBucket instanceof ScreenshotBucket) {
      await baseBucket.$fetchGraph("screenshots");
      invariant(baseBucket.screenshots, "Relation `screenshots` not loaded");
      return baseBucket.screenshots;
    }

    return baseBucket.screenshots;
  })();

  const screenshotsByName = baseScreenshots.reduce<Record<string, Screenshot>>(
    (index, screenshot) => {
      index[screenshot.baseName ?? screenshot.name] = screenshot;
      return index;
    },
    {},
  );

  for (const diff of headBuild.screenshotDiffs) {
    const status = await diff.$getDiffStatus();
    switch (status) {
      case "changed":
      case "added": {
        invariant(
          diff.compareScreenshot,
          "Relation `compareScreenshot` not loaded",
        );
        screenshotsByName[
          diff.compareScreenshot.baseName ?? diff.compareScreenshot.name
        ] = diff.compareScreenshot;
        break;
      }
      case "removed": {
        invariant(diff.baseScreenshot, "Relation `baseScreenshot` not loaded");
        delete screenshotsByName[
          diff.baseScreenshot.baseName ?? diff.baseScreenshot.name
        ];
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
