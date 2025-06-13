import { assertNever } from "@argos/util/assertNever";

import { AutomationEvent, AutomationEvents } from "@/automation/types/events";

import { SlackMessageBlock } from ".";
import { getBuildLabel } from "../build/label";
import { getStatsMessage } from "../build/stats";
import {
  Build,
  BuildAggregatedStatus,
  GithubPullRequest,
  Project,
  ScreenshotBucket,
} from "../database/models";

export function getEventDescription(event: AutomationEvent): string {
  switch (event) {
    case AutomationEvents.BuildCompleted:
      return "Build complete";
    case AutomationEvents.BuildReviewed:
      return "Build reviewed";
    default:
      assertNever(event);
  }
}
function getRepositoryUrl(project: Project): string | undefined {
  const isGitHubProject = Boolean(project.githubRepositoryId);

  if (isGitHubProject) {
    return project.githubRepository && project.githubRepository.githubAccount
      ? `https://github.com/${
          project.githubRepository.githubAccount.login
        }/${project.githubRepository.name}`
      : undefined;
  }

  return project.gitlabProject
    ? `https://gitlab.com/${project.gitlabProject.pathWithNamespace}/-`
    : undefined;
}

// Slack blocks can be tests in the playground: https://app.slack.com/block-kit-builder/
export function getBuildStatusMessage({
  build,
  buildUrl,
  pullRequest,
  compareScreenshotBucket,
  project,
  status,
}: {
  build: Build;
  buildUrl: string;
  pullRequest: GithubPullRequest | null | undefined;
  compareScreenshotBucket: ScreenshotBucket | undefined;
  project: Project;
  status: BuildAggregatedStatus;
}): SlackMessageBlock[] {
  const commit = compareScreenshotBucket?.commit;
  const commitShort = commit ? String(commit).substring(0, 7) : null;
  const statsMessage = build.stats ? getStatsMessage(build.stats) : null;
  const buildLabel = getBuildLabel(build.type, status);
  const branch = compareScreenshotBucket?.branch;

  const repositoryURL = getRepositoryUrl(project);
  const branchUrl =
    branch && repositoryURL ? `${repositoryURL}/tree/${branch}` : undefined;
  const commitUrl =
    commit && repositoryURL ? `${repositoryURL}/commit/${commit}` : undefined;

  const contextBlock: SlackMessageBlock = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*<${buildUrl}|Build #${build.number}${build.name !== "default" ? ` (${build.name})` : ""}>*`,
    },
  };

  const projectBlock: SlackMessageBlock = {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Project: *${project.name}*`,
      },
    ],
  };

  const labelBlock: SlackMessageBlock = {
    type: "section",
    text: { type: "mrkdwn", text: buildLabel },
  };

  const detailsBlock: SlackMessageBlock = {
    type: "section",
    fields: [
      statsMessage
        ? {
            type: "mrkdwn" as const,
            text: `*Screenshots:* ${statsMessage}`,
          }
        : null,
      pullRequest?.number != null
        ? {
            type: "mrkdwn" as const,
            text: `*PR:* <${`https://github.com/pull/${pullRequest.number}`}|#${pullRequest.number}> ${pullRequest.title ?? ""}`,
          }
        : null,
      commitShort
        ? {
            type: "mrkdwn" as const,
            text: `*Commit:* ${commitUrl ? `<${commitUrl}|${commitShort}>` : commitShort}`,
          }
        : null,
      branch
        ? {
            type: "mrkdwn" as const,
            text: `*Branch:* ${branchUrl ? `<${branchUrl}|${branch}>` : branch}`,
          }
        : null,
    ].filter((e) => e !== null),
  };

  return [
    contextBlock,
    projectBlock,
    labelBlock,
    { type: "divider" },
    detailsBlock,
  ];
}
