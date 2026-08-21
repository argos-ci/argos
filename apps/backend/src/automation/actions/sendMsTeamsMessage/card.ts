import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { getApprovalEmoji, getBuildLabel } from "@/build/label";
import { getRepositoryUrl } from "@/build/repository-url";
import { getStatsMessage } from "@/build/stats";
import {
  Build,
  type Account,
  type BuildReview,
  type GithubPullRequest,
  type Project,
  type ScreenshotBucket,
} from "@/database/models";
import { UnretryableError } from "@/job-core";
import {
  escapeMsTeamsText,
  link,
  type AdaptiveCard,
  type AdaptiveCardElement,
} from "@/msteams/card";

import { type AutomationMessage } from "../../types/events";

function testDisclaimerBlock(): AdaptiveCardElement {
  return {
    type: "TextBlock",
    text: "This notification is a test message. It uses the latest build of your project and ignores any configured conditions. This is for preview purposes only.",
    wrap: true,
    size: "small",
    isSubtle: true,
  };
}

function titleBlock(props: {
  build: Build;
  buildUrl: string;
}): AdaptiveCardElement {
  const { build, buildUrl } = props;
  const title = `Build #${build.number}${
    build.name !== "default" ? ` (${build.name})` : ""
  }`;
  return {
    type: "TextBlock",
    text: link(title, buildUrl),
    wrap: true,
    size: "medium",
    weight: "bolder",
  };
}

function projectBlock(props: { project: Project }): AdaptiveCardElement {
  const { project } = props;
  return {
    type: "TextBlock",
    text: `Project: **${escapeMsTeamsText(project.name)}**`,
    wrap: true,
    size: "small",
    isSubtle: true,
    spacing: "none",
  };
}

function statusBlock(props: { text: string }): AdaptiveCardElement {
  return {
    type: "TextBlock",
    text: props.text,
    wrap: true,
    spacing: "medium",
  };
}

function buildReviewText(props: {
  buildReview: BuildReview;
  reviewerAccount: Account | null;
}): string {
  const { buildReview, reviewerAccount } = props;
  const reviewer = escapeMsTeamsText(reviewerAccount?.name ?? "Unknown");
  switch (buildReview.state) {
    case "approved":
      return `${getApprovalEmoji("approved")} Approved by ${reviewer}`;
    case "rejected":
      return `${getApprovalEmoji("rejected")} Rejected by ${reviewer}`;
    case "commented":
      return `💬 Commented by ${reviewer}`;
    case "pending":
      throw new UnretryableError(
        `Microsoft Teams notification not implemented for build review state: ${buildReview.state}`,
      );
    default:
      assertNever(buildReview.state, "Unknown build review state");
  }
}

function detailsBlock(props: {
  build: Build;
  project: Project;
  compareScreenshotBucket: ScreenshotBucket | null;
  pullRequest: GithubPullRequest | null;
}): AdaptiveCardElement | null {
  const { build, compareScreenshotBucket, project, pullRequest } = props;
  const commit = compareScreenshotBucket?.commit;
  const commitShort = commit ? String(commit).substring(0, 7) : null;
  const statsMessage = build.stats
    ? getStatsMessage(build.stats, { isSubsetBuild: build.subset })
    : null;
  const branch = compareScreenshotBucket?.branch;
  const repositoryURL = getRepositoryUrl(project);
  const pullRequestUrl =
    repositoryURL && pullRequest
      ? `${repositoryURL}/pull/${pullRequest.number}`
      : null;
  const branchUrl =
    branch && repositoryURL ? `${repositoryURL}/tree/${branch}` : null;
  const commitUrl =
    commit && repositoryURL ? `${repositoryURL}/commit/${commit}` : null;

  const facts = [
    statsMessage
      ? { title: "Screenshots", value: escapeMsTeamsText(statsMessage) }
      : null,
    pullRequest
      ? {
          title: "PR",
          value: (() => {
            const label = `#${pullRequest.number}${
              pullRequest.title ? ` ${pullRequest.title}` : ""
            }`;
            return pullRequestUrl
              ? link(label, pullRequestUrl)
              : escapeMsTeamsText(label);
          })(),
        }
      : null,
    commitShort
      ? {
          title: "Commit",
          value: commitUrl
            ? link(commitShort, commitUrl)
            : escapeMsTeamsText(commitShort),
        }
      : null,
    branch
      ? {
          title: "Branch",
          value: branchUrl
            ? link(branch, branchUrl)
            : escapeMsTeamsText(branch),
        }
      : null,
  ].filter((fact) => fact !== null);

  if (facts.length === 0) {
    return null;
  }

  return { type: "FactSet", facts, separator: true };
}

/**
 * Build the Adaptive Card for a given automation message.
 *
 * Mirrors the Slack message built in `sendSlackMessage/message.ts` so both
 * integrations stay consistent.
 */
export async function buildMsTeamsCard(args: {
  message: AutomationMessage;
  isTestMessage: boolean;
}): Promise<AdaptiveCard> {
  const { message, isTestMessage } = args;
  const { build } = message.payload;

  const body: AdaptiveCardElement[] = [];

  if (isTestMessage) {
    body.push(testDisclaimerBlock());
  }

  const [buildUrl, richBuild, [buildStatus]] = await Promise.all([
    build.getUrl(),
    build.$clone().$fetchGraph(`
    [
      project.[
        githubRepository.[
          githubAccount
        ]
        gitlabProject
      ],
      pullRequest.[
        githubRepository.[
          githubAccount
        ]
      ]
    ]
  `),
    message.event === "build.completed"
      ? Build.getAggregatedBuildStatuses([build])
      : [null],
  ]);
  invariant(richBuild.project, "project not found");

  body.push(titleBlock({ build, buildUrl }));
  body.push(projectBlock({ project: richBuild.project }));

  if (message.event === "build.completed") {
    invariant(buildStatus, "build status not found");
    body.push(statusBlock({ text: getBuildLabel(build.type, buildStatus) }));
  } else if (message.event === "build.reviewed") {
    const richBuildReview = await message.payload.buildReview
      .$clone()
      .$fetchGraph("user.account");
    body.push(
      statusBlock({
        text: buildReviewText({
          buildReview: message.payload.buildReview,
          reviewerAccount: richBuildReview.user?.account ?? null,
        }),
      }),
    );
  }

  const details = detailsBlock({
    build,
    project: richBuild.project,
    compareScreenshotBucket: message.payload.compareScreenshotBucket,
    pullRequest: richBuild.pullRequest ?? null,
  });

  if (details) {
    body.push(details);
  }

  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body,
    actions: [{ type: "Action.OpenUrl", title: "View build", url: buildUrl }],
  };
}
