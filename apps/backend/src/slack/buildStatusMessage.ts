import { invariant } from "@argos/util/invariant";

import { AutomationEvent, AutomationEvents } from "@/automation/types/events";
import { UnretryableError } from "@/job-core";

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

const EventDescriptions: Record<AutomationEvent, string> = {
  [AutomationEvents.BuildCompleted]: "Build complete",
  [AutomationEvents.BuildReviewed]: "Build reviewed",
};

export function getEventDescription(event: AutomationEvent): string {
  return EventDescriptions[event];
}

function getRepositoryUrl(project: Project): string | null {
  if (project.githubRepositoryId) {
    invariant(
      project.githubRepository,
      "githubRepository relation is expected to be loaded",
      UnretryableError,
    );

    invariant(
      project.githubRepository.githubAccount,
      "githubAccount relation not found",
      UnretryableError,
    );

    return `https://github.com/${
      project.githubRepository.githubAccount.login
    }/${project.githubRepository.name}`;
  }

  if (project.gitlabProjectId) {
    invariant(
      project.gitlabProject,
      "gitlabProject relation is expected to be loaded",
      UnretryableError,
    );

    return `https://gitlab.com/${project.gitlabProject.pathWithNamespace}`;
  }

  return null;
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
  pullRequest: GithubPullRequest | null;
  compareScreenshotBucket: ScreenshotBucket | null;
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
