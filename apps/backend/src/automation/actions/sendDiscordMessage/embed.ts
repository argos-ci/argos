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
import {
  EMBED_COLOR,
  EMBED_LIMITS,
  escapeDiscordText,
  link,
  truncate,
  type DiscordEmbed,
  type DiscordEmbedField,
} from "@/discord/embed";
import { UnretryableError } from "@/job-core";

import { type AutomationMessage } from "../../types/events";

const TEST_DISCLAIMER =
  "This notification is a test message. It uses the latest build of your project and ignores any configured conditions. This is for preview purposes only.";

/**
 * Budget for a label before it is escaped and wrapped in a link.
 *
 * Escaping can double a string and the href adds a hundred characters or so, so
 * this stays comfortably under the 1024-character field-value limit. Only PR
 * titles get anywhere near it, and Discord rejects the *whole* message when a
 * limit is exceeded — a verbose PR title must not take the notification down.
 */
const MAX_LABEL_LENGTH = 200;

function buildReviewText(props: {
  buildReview: BuildReview;
  reviewerAccount: Account | null;
}): string {
  const { buildReview, reviewerAccount } = props;
  const reviewer = escapeDiscordText(reviewerAccount?.name ?? "Unknown");
  switch (buildReview.state) {
    case "approved":
      return `${getApprovalEmoji("approved")} Approved by ${reviewer}`;
    case "rejected":
      return `${getApprovalEmoji("rejected")} Rejected by ${reviewer}`;
    case "commented":
      return `💬 Commented by ${reviewer}`;
    case "pending":
      throw new UnretryableError(
        `Discord notification not implemented for build review state: ${buildReview.state}`,
      );
    default:
      assertNever(buildReview.state, "Unknown build review state");
  }
}

/**
 * Build the embed fields describing the build.
 *
 * The three short ones are inline so Discord lays them out on a single row; the
 * PR is not, because its title is long enough to be unreadable in a third of
 * the embed width. That puts it on a row of its own, below.
 */
function detailsFields(props: {
  build: Build;
  project: Project;
  compareScreenshotBucket: ScreenshotBucket | null;
  pullRequest: GithubPullRequest | null;
}): DiscordEmbedField[] {
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

  return [
    statsMessage
      ? {
          name: "Screenshots",
          value: escapeDiscordText(truncate(statsMessage, MAX_LABEL_LENGTH)),
          inline: true,
        }
      : null,
    commitShort
      ? {
          name: "Commit",
          value: commitUrl
            ? link(commitShort, commitUrl)
            : escapeDiscordText(commitShort),
          inline: true,
        }
      : null,
    branch
      ? {
          name: "Branch",
          value: branchUrl
            ? link(truncate(branch, MAX_LABEL_LENGTH), branchUrl)
            : escapeDiscordText(truncate(branch, MAX_LABEL_LENGTH)),
          inline: true,
        }
      : null,
    pullRequest
      ? {
          name: "PR",
          value: (() => {
            const label = truncate(
              `#${pullRequest.number}${
                pullRequest.title ? ` ${pullRequest.title}` : ""
              }`,
              MAX_LABEL_LENGTH,
            );
            return pullRequestUrl
              ? link(label, pullRequestUrl)
              : escapeDiscordText(label);
          })(),
        }
      : null,
  ].filter((field) => field !== null);
}

/**
 * Build the Discord embed for a given automation message.
 *
 * Mirrors the Slack message built in `sendSlackMessage/message.ts` and the
 * Adaptive Card built in `sendMsTeamsMessage/card.ts` so all three integrations
 * stay consistent. The mapping differs where Discord has a native equivalent:
 * the build link is the embed's own `url` rather than a Markdown link, the
 * project sits in the author line, and the test disclaimer goes in the footer —
 * Discord's subtle slot, and the only one it renders small.
 */
export async function buildDiscordEmbed(args: {
  message: AutomationMessage;
  isTestMessage: boolean;
}): Promise<DiscordEmbed> {
  const { message, isTestMessage } = args;
  const { build } = message.payload;

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

  const description = await (async () => {
    switch (message.event) {
      case "build.completed": {
        invariant(buildStatus, "build status not found");
        return getBuildLabel(build.type, buildStatus);
      }
      case "build.reviewed": {
        const richBuildReview = await message.payload.buildReview
          .$clone()
          .$fetchGraph("user.account");
        return buildReviewText({
          buildReview: message.payload.buildReview,
          reviewerAccount: richBuildReview.user?.account ?? null,
        });
      }
      default:
        assertNever(message);
    }
  })();

  const title = `Build #${build.number}${
    build.name !== "default" ? ` (${build.name})` : ""
  }`;

  const fields = detailsFields({
    build,
    project: richBuild.project,
    compareScreenshotBucket: message.payload.compareScreenshotBucket,
    pullRequest: richBuild.pullRequest ?? null,
  });

  return {
    // Titles, author names and footers render as plain text, so they carry the
    // raw value — escaping would surface literal backslashes.
    title: truncate(title, EMBED_LIMITS.title),
    url: buildUrl,
    color: EMBED_COLOR,
    author: {
      name: truncate(
        `Project: ${richBuild.project.name}`,
        EMBED_LIMITS.authorName,
      ),
    },
    description: truncate(description, EMBED_LIMITS.description),
    ...(fields.length > 0 ? { fields } : {}),
    ...(isTestMessage ? { footer: { text: TEST_DISCLAIMER } } : {}),
  };
}
