import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { Build } from "@/database/models/index.js";
import { type SlackMessageBlock } from "@/slack/channel";

import { type AutomationMessage } from "../../types/events";
import {
  buildReviewBlock,
  contextBlock,
  detailsBlock,
  labelBlock,
  projectBlock,
  testDisclaimerBlock,
} from "./blocks";

/**
 * Get the Slack message for a given automation message.
 * Returns the blocks and text for the Slack message.
 */
export async function buildSlackMessage(args: {
  message: AutomationMessage;
  isTestMessage: boolean;
}): Promise<{ blocks: SlackMessageBlock[]; text: string }> {
  const { message, isTestMessage } = args;
  const { build } = message.payload;

  const blocks: SlackMessageBlock[] = [];
  let text: string;

  if (isTestMessage) {
    blocks.push(testDisclaimerBlock());
  }

  const [buildUrl, richBuild, [buildStatus]] = await Promise.all([
    build.getUrl(),
    build.$clone().$fetchGraph(`
    [
      compareScreenshotBucket,
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

  blocks.push(contextBlock({ build, buildUrl }));
  blocks.push(projectBlock({ project: richBuild.project }));

  if (message.event === "build.completed") {
    invariant(buildStatus, "build status not found");
    blocks.push(labelBlock({ build, buildStatus }));
  } else if (message.event === "build.reviewed") {
    const richBuildReview = await message.payload.buildReview
      .$clone()
      .$fetchGraph("user.account");
    blocks.push(
      buildReviewBlock({
        buildReview: message.payload.buildReview,
        reviewerAccount: richBuildReview.user?.account ?? null,
      }),
    );
  }

  blocks.push({ type: "divider" });
  blocks.push(
    detailsBlock({
      build,
      project: richBuild.project,
      compareScreenshotBucket: richBuild.compareScreenshotBucket ?? null,
      pullRequest: richBuild.pullRequest ?? null,
    }),
  );

  switch (message.event) {
    case "build.completed":
      text = `Build #${build.number} completed`;
      break;
    case "build.reviewed":
      text = `Build #${build.number} has been ${message.payload.buildReview.state}`;
      break;
    default:
      assertNever(message);
  }

  return { blocks, text };
}
