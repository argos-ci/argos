import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import type * as Bolt from "@slack/bolt";
import { match } from "path-to-regexp";

import { getBuildLabel } from "@/build/label";
import { getStatsMessage } from "@/build/stats";
import { Build, ScreenshotDiff, Test } from "@/database/models";
import { getTestAllMetrics } from "@/metrics/test";
import { getPublicFileUrl, getTwicPicsUrl } from "@/storage";
import { safeParseTestId } from "@/util/test-id";

type BuildMatchParams = {
  accountSlug: string;
  projectName: string;
  buildNumber: string;
  diffId?: string;
};

export const matchBuildPath = match<BuildMatchParams>(
  "/:accountSlug/:projectName/builds/:buildNumber{/:diffId}",
);

export async function unfurlBuild(
  params: BuildMatchParams,
  auth: { accountId: string },
): Promise<Bolt.types.MessageAttachment | null> {
  const build = await Build.query()
    .withGraphJoined("project.account")
    .where("project.name", params.projectName)
    .where("builds.number", params.buildNumber)
    .where("project:account.id", auth.accountId)
    .where("project:account.slug", params.accountSlug)
    .first();

  if (!build) {
    return null;
  }

  const statsMessage = build.stats
    ? getStatsMessage(build.stats, { isSubsetBuild: build.subset })
    : null;

  const [[status], screenshotDiff] = await Promise.all([
    Build.getAggregatedBuildStatuses([build]),
    params.diffId
      ? ScreenshotDiff.query()
          .findById(params.diffId)
          .where("buildId", build.id)
          .withGraphFetched("[baseScreenshot.file, compareScreenshot.file]")
      : null,
  ]);
  invariant(status, "Status should be loaded");
  invariant(build.project, "Project should be loaded");
  invariant(build.project.account, "Account should be loaded");

  const screenshot =
    screenshotDiff?.compareScreenshot || screenshotDiff?.baseScreenshot;
  const imageUrl = await (() => {
    if (!screenshot) {
      return null;
    }
    if (!screenshot.file) {
      return getTwicPicsUrl(screenshot.s3Id);
    }
    return getPublicFileUrl(screenshot.file);
  })();

  const attachment: Bolt.types.MessageAttachment = {
    title: `Build ${build.number} — ${build.name} — ${build.project.account.displayName}/${build.project.name}`,
    fields: [
      { title: "Status", value: getBuildLabel(build.type, status) },
      statsMessage ? { title: "Screenshots", value: statsMessage } : null,
    ].filter(checkIsNonNullable),
  };

  if (imageUrl) {
    attachment.image_url = imageUrl;
  }

  return attachment;
}

type TestMatchParams = {
  accountSlug: string;
  projectName: string;
  testId: string;
};

export const matchTestPath = match<TestMatchParams>(
  "/:accountSlug/:projectName/tests/:testId",
);

/**
 * Format a `0..1` metric ratio as a rounded percentage (e.g. `0.42` → `42%`).
 */
function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export async function unfurlTest(
  params: TestMatchParams,
  auth: { accountId: string },
): Promise<Bolt.types.MessageAttachment | null> {
  const parsed = safeParseTestId(params.testId);
  if (!parsed) {
    return null;
  }

  const test = await Test.query()
    .withGraphJoined("project.account")
    .where("tests.id", parsed.testId)
    .where("project.name", params.projectName)
    .where("project:account.id", auth.accountId)
    .where("project:account.slug", params.accountSlug)
    .first();

  if (!test) {
    return null;
  }

  invariant(test.project, "Project should be loaded");
  invariant(test.project.account, "Account should be loaded");

  const [metrics, latestDiff] = await Promise.all([
    getTestAllMetrics([test.id], { from: new Date(0) }).then(([m]) => m),
    ScreenshotDiff.query()
      .where("testId", test.id)
      .whereNotNull("compareScreenshotId")
      .orderBy("createdAt", "desc")
      .withGraphFetched("compareScreenshot.file")
      .first(),
  ]);
  invariant(metrics, "Metrics should be computed");

  const screenshot = latestDiff?.compareScreenshot;
  const imageUrl = await (() => {
    if (!screenshot) {
      return null;
    }
    if (!screenshot.file) {
      return getTwicPicsUrl(screenshot.s3Id);
    }
    return getPublicFileUrl(screenshot.file);
  })();

  const attachment: Bolt.types.MessageAttachment = {
    title: `${test.name} — ${test.project.account.displayName}/${test.project.name}`,
    fields: [
      { title: "Flakiness", value: formatPercent(metrics.flakiness) },
      { title: "Stability", value: formatPercent(metrics.stability) },
    ],
  };

  if (imageUrl) {
    attachment.image_url = imageUrl;
  }

  return attachment;
}
