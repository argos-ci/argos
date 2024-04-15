import { invariant } from "@argos/util/invariant";

import { getNotificationPayload } from "@/build-notification/index.js";
import { Build, BuildAggregatedStatus } from "@/database/models/Build.js";
import { BuildNotification } from "@/database/models/BuildNotification.js";
import { repoAuth } from "@/web/middlewares/repoAuth.js";
import { boom } from "@/web/util.js";

import { CreateAPIHandler } from "../util.js";

function getBuildNotificationTypeFromBuildStatus(
  buildStatus: BuildAggregatedStatus,
): BuildNotification["type"] | null {
  switch (buildStatus) {
    case "accepted":
      return "diff-accepted";
    case "rejected":
      return "diff-rejected";
    case "diffDetected":
      return "diff-detected";
    case "pending":
      return "queued";
    case "progress":
      return "progress";
    case "stable":
      return "no-diff-detected";
    default:
      return null;
  }
}

export const getAuthProjectBuilds: CreateAPIHandler = ({ get }) => {
  return get("/project/builds", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }

    const { page, perPage, commit, distinctName } = req.ctx.query;

    const filterQuery = Build.query()
      .select("builds.id")
      .where("builds.projectId", req.authProject.id);

    if (commit) {
      // Check if the commit is in the compareScreenshotBucket or prHeadCommit
      filterQuery.joinRelated("compareScreenshotBucket").where((qb) => {
        qb.where("compareScreenshotBucket.commit", commit).orWhere(
          "prHeadCommit",
          commit,
        );
      });
    }

    if (distinctName) {
      filterQuery.distinctOn("builds.name").orderBy("builds.name");
    }

    const builds = await Build.query()
      .withGraphFetched("project.account")
      .whereIn("id", filterQuery)
      .orderBy("builds.id", "desc")
      .page(page - 1, perPage);

    const [statuses, urls] = await Promise.all([
      Build.getAggregatedBuildStatuses(builds.results),
      Promise.all(builds.results.map((build) => build.getUrl())),
    ]);

    const notificationPayloads = await Promise.all(
      builds.results.map((build, i) => {
        const status = statuses[i];
        invariant(status, "Status should be fetched for all builds");
        const buildNotificationType =
          getBuildNotificationTypeFromBuildStatus(status);
        if (!buildNotificationType) {
          return null;
        }
        return getNotificationPayload({
          buildNotification: { type: buildNotificationType },
          build,
        });
      }),
    );

    res.send({
      results: builds.results.map((build, i) => {
        const status = statuses[i];
        invariant(status, "Status should be fetched for all builds");
        const url = urls[i];
        invariant(url, "URL should be fetched for all builds");
        const notificationPayload = notificationPayloads[i];
        invariant(
          notificationPayload !== undefined,
          "Notification payload should be fetched for all builds",
        );
        return {
          id: build.id,
          number: build.number,
          status,
          url,
          notification: notificationPayload,
        };
      }),
      pageInfo: {
        total: builds.total,
        page,
        perPage,
      },
    });
  });
};
