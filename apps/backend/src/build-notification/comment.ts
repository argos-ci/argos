import { invariant } from "@argos/util/invariant";

import { getBuildLabel } from "@/build/label.js";
import { getStatsMessage } from "@/build/stats.js";
import { getCommentHeader } from "@/database/index.js";
import { Build } from "@/database/models/index.js";

const dateFormatter = Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});
const formatDate = (date: string): string => {
  const d = new Date(date);
  return dateFormatter.format(d);
};

export const getCommentBody = async (props: {
  commit: string;
}): Promise<string> => {
  const builds = await Build.query()
    .distinctOn("builds.name")
    .joinRelated("compareScreenshotBucket")
    .where("compareScreenshotBucket.commit", props.commit)
    .orderBy([
      { column: "name", order: "desc" },
      { column: "builds.number", order: "desc" },
    ]);

  const aggregateStatuses = await Build.getAggregatedBuildStatuses(builds);
  const buildRows = await Promise.all(
    builds.map(async (build, index) => {
      const [stats, url] = await Promise.all([
        getStatsMessage(build.id),
        build.getUrl(),
      ]);
      const status = aggregateStatuses[index];
      invariant(status, "unknown build status");
      const label = getBuildLabel(build.type, status);
      const review = status === "diffDetected" ? ` ([Review](${url}))` : "";
      return `| **${build.name}** ([Inspect](${url})) | ${label}${review} | ${
        stats || "-"
      } | ${formatDate(build.updatedAt)} |`;
    }),
  );
  return [
    getCommentHeader(),
    "",
    `| Build | Status | Details | Updated (UTC) |`,
    `| :---- | :----- | :------ | :------------ |`,
    ...buildRows.sort(),
  ].join("\n");
};
