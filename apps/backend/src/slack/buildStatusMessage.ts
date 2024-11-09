import { SlackMessageBlock } from ".";
import { BuildType, GithubPullRequest } from "../database/models";

export function getBuildStatusMessage(
  build: {
    id: string;
    name: string;
    number: number;
    type: BuildType | null;
    commit?: string;
    pullRequest?: GithubPullRequest | null;
    compareScreenshotBucket?: {
      branch: string;
      screenshotCount: number;
    };
  },
  project: {
    name: string;
    url: string;
  },
  notification: {
    description: string;
  },
): SlackMessageBlock[] {
  const commitShort = build.commit?.substring(0, 7);
  const buildUrl = `${project.url}/builds/${build.id}`;

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*project ${project.name} | <${buildUrl}|Build ${build.number}: ${build.name}> of*\n*Visual Changes:* _${notification.description}_`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Review Changes",
        },
        url: buildUrl,
        action_id: "build-link",
      },
    },
    { type: "divider" },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Type:* ${build.type}` },
        { type: "mrkdwn", text: `*Commit:* ${commitShort}` },
        {
          type: "mrkdwn",
          text: `*Branch:* ${build.compareScreenshotBucket?.branch}`,
        },
        {
          type: "mrkdwn",
          text: `*Screenshots Compared:* ${build.compareScreenshotBucket?.screenshotCount}`,
        },
      ],
    },
  ];

  if (build.pullRequest?.number) {
    blocks.push({
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Pull Request #<https://github.com/|#${build.pullRequest.number}:* ${build.pullRequest.title}>`,
        },
      ],
    });
  }

  return blocks;
}
