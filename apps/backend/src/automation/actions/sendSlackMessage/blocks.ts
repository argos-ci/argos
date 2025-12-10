import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { getApprovalEmoji, getBuildLabel } from "@/build/label";
import { getStatsMessage } from "@/build/stats";
import {
  Build,
  type Account,
  type BuildReview,
  type GithubPullRequest,
  type Project,
  type ScreenshotBucket,
} from "@/database/models";
import type { BuildAggregatedStatus } from "@/database/schemas/BuildStatus";
import { UnretryableError } from "@/job-core";
import type { SlackMessageBlock } from "@/slack/channel";

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

export function testDisclaimerBlock(): SlackMessageBlock {
  return {
    type: "context",
    elements: [
      {
        type: "plain_text",
        text: "This notification is a test message. It uses the latest build of your project and ignores any configured conditions. This is for preview purposes only.",
      },
    ],
  };
}

export function contextBlock(props: {
  build: Build;
  buildUrl: string;
}): SlackMessageBlock {
  const { build, buildUrl } = props;
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*<${buildUrl}|Build #${build.number}${build.name !== "default" ? ` (${build.name})` : ""}>*`,
    },
  };
}

export function projectBlock(props: { project: Project }): SlackMessageBlock {
  const { project } = props;
  return {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Project: *${project.name}*`,
      },
    ],
  };
}

export function labelBlock(props: {
  build: Build;
  buildStatus: BuildAggregatedStatus;
}): SlackMessageBlock {
  const { build, buildStatus } = props;
  const buildLabel = getBuildLabel(build.type, buildStatus);
  return {
    type: "section",
    text: { type: "mrkdwn", text: buildLabel },
  };
}

export function buildReviewBlock(props: {
  buildReview: BuildReview;
  reviewerAccount: Account | null;
}): SlackMessageBlock {
  const { buildReview, reviewerAccount } = props;
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: (() => {
        switch (buildReview.state) {
          case "approved":
            return `${getApprovalEmoji("approved")} Approved by ${reviewerAccount?.name ?? "Unknown"}`;
          case "rejected":
            return `${getApprovalEmoji("rejected")} Rejected by ${reviewerAccount?.name ?? "Unknown"}`;
          default:
            assertNever(buildReview.state, "Unknown build review state");
        }
      })(),
    },
  };
}

export function detailsBlock(props: {
  build: Build;
  project: Project;
  compareScreenshotBucket: ScreenshotBucket | null;
  pullRequest: GithubPullRequest | null;
}): SlackMessageBlock {
  const { build, compareScreenshotBucket, project, pullRequest } = props;
  const commit = compareScreenshotBucket?.commit;
  const commitShort = commit ? String(commit).substring(0, 7) : null;
  const statsMessage = build.stats ? getStatsMessage(build.stats) : null;
  const branch = compareScreenshotBucket?.branch;
  const repositoryURL = getRepositoryUrl(project);
  const branchUrl =
    branch && repositoryURL ? `${repositoryURL}/tree/${branch}` : undefined;
  const commitUrl =
    commit && repositoryURL ? `${repositoryURL}/commit/${commit}` : undefined;

  return {
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
}
