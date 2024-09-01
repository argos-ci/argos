import { invariant } from "@argos/util/invariant";

import { getBuildLabel } from "@/build/label.js";
import { getStatsMessage } from "@/build/stats.js";
import { getCommentHeader } from "@/database/index.js";
import { Build, Project } from "@/database/models/index.js";

const dateFormatter = Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatDate(date: string): string {
  const d = new Date(date);
  return dateFormatter.format(d);
}

/**
 * Get the name of the build.
 * If the build is associated with a project, the project name is prepended.
 */
function getBuildName(input: { build: Build; project: Project | null }) {
  if (input.project) {
    return `${input.project.name}/${input.build.name}`;
  }

  return input.build.name;
}

export const getCommentBody = async (props: {
  commit: string;
}): Promise<string> => {
  const builds = await Build.query()
    .distinctOn("builds.name", "builds.projectId")
    .joinRelated("compareScreenshotBucket")
    .withGraphFetched("project")
    .where("compareScreenshotBucket.commit", props.commit)
    .orderBy([
      { column: "builds.name", order: "desc" },
      { column: "builds.projectId", order: "desc" },
      { column: "builds.number", order: "desc" },
    ]);

  const hasMultipleProjects =
    new Set(builds.map((build) => build.projectId)).size > 1;
  const aggregateStatuses = await Build.getAggregatedBuildStatuses(builds);
  const buildRows = await Promise.all(
    builds
      // Filter out builds that are not associated with a project that has PR comments enabled.
      // We don't filter at SQL level because we still want to know if it's linked to multiple projects
      // to determine if we should prepend the project name to the build name.
      .filter((build) => {
        invariant(build.project, "Relation `project` should be fetched");
        return build.project.prCommentEnabled;
      })
      .map(async (build, index) => {
        invariant(build.project, "Relation `project` should be fetched");

        const [stats, url] = await Promise.all([
          getStatsMessage(build.id),
          build.getUrl(),
        ]);

        const status = aggregateStatuses[index];
        invariant(status, "unknown build status");

        const label = getBuildLabel(build.type, status);
        const review = status === "diffDetected" ? ` ([Review](${url}))` : "";
        const name = getBuildName({
          build,
          project: hasMultipleProjects ? build.project : null,
        });

        return `| **${name}** ([Inspect](${url})) | ${label}${review} | ${
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
