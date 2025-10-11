import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import type * as Bolt from "@slack/bolt";
import { match } from "path-to-regexp";

import { getBuildLabel } from "@/build/label.js";
import { getStatsMessage } from "@/build/stats.js";
import { Build, ScreenshotDiff } from "@/database/models";
import { getPublicImageFileUrl, getTwicPicsUrl } from "@/storage";

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

  const statsMessage = build.stats ? getStatsMessage(build.stats) : null;

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
    return getPublicImageFileUrl(screenshot.file);
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
