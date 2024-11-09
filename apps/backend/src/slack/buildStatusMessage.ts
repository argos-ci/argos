import { assertNever } from "@argos/util/assertNever";

import { AutomationEvent, AutomationEvents } from "@/automation/types/events";

import { SlackMessageBlock } from ".";
import {
  Build,
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

// Slack blocks can be tests in the playground: https://app.slack.com/block-kit-builder/

export function getBuildStatusMessage({
  build,
  buildUrl,
  pullRequest,
  compareScreenshotBucket,
  project,
  event,
}: {
  build: Build;
  buildUrl: string;
  pullRequest: GithubPullRequest | null | undefined;
  compareScreenshotBucket: ScreenshotBucket | undefined;
  project: Project;
  event: AutomationEvent;
}): SlackMessageBlock[] {
  const commit = compareScreenshotBucket?.commit;
  const commitShort = commit ? String(commit).substring(0, 7) : "N/A";

  const blocks: SlackMessageBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: getEventDescription(event),
        emoji: true,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<${buildUrl}|Build #${build.number}: ${build.name}> on *${project.name}*`,
        },
      ],
    },
    { type: "divider" },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Type:* ${build.type ?? "N/A"}` },
        { type: "mrkdwn", text: `*Commit:* ${commitShort}` },
        {
          type: "mrkdwn",
          text: `*Branch:* ${compareScreenshotBucket?.branch ?? "N/A"}`,
        },
        {
          type: "mrkdwn",
          text: `*Screenshots:* ${compareScreenshotBucket?.screenshotCount ?? 0}`,
        },
      ],
    },
  ];

  if (pullRequest && pullRequest.number && pullRequest.title) {
    const prUrl = `https://github.com/pull/${pullRequest.number}`;
    blocks.push({
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Pull Request:* <${prUrl}|#${pullRequest.number}: ${pullRequest.title}>`,
        },
      ],
    });
  }

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Build",
        },
        url: buildUrl,
        action_id: "view-build-button",
        style: "primary",
      },
    ],
  });

  return blocks;
}
