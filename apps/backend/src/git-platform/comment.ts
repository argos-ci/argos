import { invariant } from "@argos/util/invariant";

import { getBuildLabel } from "@/build/label";
import { getStatsMessage } from "@/build/stats";
import { getCommentHeader } from "@/database";
import { Build, Deployment, Project } from "@/database/models";

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

function getDeploymentName(input: {
  deployment: Deployment;
  project: Project | null;
}) {
  const name = input.deployment.environment;
  if (input.project) {
    return `${input.project.name}/${name}`;
  }

  return name;
}

function getDeploymentLabel(deployment: Deployment): string {
  switch (deployment.status) {
    case "pending":
      return "Deploying";
    case "ready":
      return "Ready";
    case "error":
      return "Failed";
    default:
      invariant(false, "Unknown deployment status");
  }
}

function getBuildRows(input: {
  builds: Build[];
  hasMultipleProjects: boolean;
  aggregateStatuses: Awaited<
    ReturnType<typeof Build.getAggregatedBuildStatuses>
  >;
  urls: string[];
}) {
  return input.builds
    .filter((build) => {
      invariant(build.project, "Relation `project` should be fetched");
      return build.project.prCommentEnabled;
    })
    .map((build, index) => {
      invariant(build.project, "Relation `project` should be fetched");

      const url = input.urls[index];
      invariant(url, "missing build URL");

      const status = input.aggregateStatuses[index];
      invariant(status, "missing build status");

      const stats = build.stats
        ? getStatsMessage(build.stats, { isSubsetBuild: build.subset })
        : null;

      const label = getBuildLabel(build.type, status);
      const review =
        status === "changes-detected" && build.type !== "reference"
          ? ` ([Review](${url}))`
          : "";
      const name = getBuildName({
        build,
        project: input.hasMultipleProjects ? build.project : null,
      });

      return `| **${name}** ([Inspect](${url})) | ${label}${review} | ${
        stats || "-"
      } | ${formatDate(build.updatedAt)} |`;
    });
}

function getDeploymentRows(input: {
  deployments: Deployment[];
  hasMultipleProjects: boolean;
}) {
  return input.deployments
    .filter((deployment) => {
      invariant(deployment.project, "Relation `project` should be fetched");
      return deployment.project.prCommentEnabled;
    })
    .map((deployment) => {
      invariant(deployment.project, "Relation `project` should be fetched");

      const name = getDeploymentName({
        deployment,
        project: input.hasMultipleProjects ? deployment.project : null,
      });

      return `| **${name}** ([Open](${deployment.url})) | ${getDeploymentLabel(
        deployment,
      )} | ${deployment.branch} | ${formatDate(deployment.updatedAt)} |`;
    });
}

export async function getCommentBody(props: {
  commit: string;
}): Promise<string> {
  const [builds, deployments] = await Promise.all([
    Build.query()
      .distinctOn("builds.name", "builds.projectId")
      .joinRelated("compareScreenshotBucket")
      .withGraphFetched("project.account")
      .where("compareScreenshotBucket.commit", props.commit)
      .orderBy([
        { column: "builds.name", order: "desc" },
        { column: "builds.projectId", order: "desc" },
        { column: "builds.number", order: "desc" },
      ]),
    Deployment.query()
      .distinctOn("deployments.projectId", "deployments.environment")
      .withGraphFetched("project")
      .where("deployments.commitSha", props.commit)
      .orderBy([
        { column: "deployments.projectId", order: "desc" },
        { column: "deployments.environment", order: "desc" },
        { column: "deployments.createdAt", order: "desc" },
        { column: "deployments.id", order: "desc" },
      ]),
  ]);

  const hasMultipleProjects =
    new Set([
      ...builds.map((build) => build.projectId),
      ...deployments.map((deployment) => deployment.projectId),
    ]).size > 1;
  const [aggregateStatuses, urls] = await Promise.all([
    Build.getAggregatedBuildStatuses(builds),
    Promise.all(builds.map((build) => build.getUrl())),
  ]);
  const buildRows = getBuildRows({
    builds,
    hasMultipleProjects,
    aggregateStatuses,
    urls,
  });
  const deploymentRows = getDeploymentRows({
    deployments,
    hasMultipleProjects,
  });
  const parts = [getCommentHeader()];

  if (buildRows.length > 0) {
    parts.push(
      "",
      "| Build | Status | Details | Updated (UTC) |",
      "| :---- | :----- | :------ | :------------ |",
      ...buildRows.sort(),
    );
  }

  if (deploymentRows.length > 0) {
    parts.push(
      "",
      "| Deployment | Status | Branch | Updated (UTC) |",
      "| :--------- | :----- | :----- | :------------ |",
      ...deploymentRows.sort(),
    );
  }

  return parts.join("\n");
}
