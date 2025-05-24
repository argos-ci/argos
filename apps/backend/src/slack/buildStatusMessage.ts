import { SlackMessageBlock } from ".";
import { BuildType, GithubPullRequest, AutomationRule } from "../database/models";
import { AutomationEvent } from "../automation"; // Assuming AutomationEvent is exported from here

// Helper function to translate event types into human-readable strings
export function getEventDescription(event: AutomationEvent): string {
  switch (event) {
    case AutomationEvent.BuildCompleted:
      return "A build has completed.";
    case AutomationEvent.BuildReviewApproved:
      return "A build review was approved.";
    case AutomationEvent.BuildReviewRejected:
      return "A build review was rejected.";
    // Add more cases for other known events as needed
    default:
      // For unknown or new events, provide a generic fallback
      const eventName = event.toString().replace(/_/g, " ").toLowerCase();
      return `An automation event (${eventName}) occurred.`;
  }
}

type AutomationContext = {
  rule: Pick<AutomationRule, 'name' | 'id'>; // Assuming AutomationRule has name and id
  event: AutomationEvent;
};

// Renamed function with updated signature
export function getAutomationSlackMessageBlocks(
  build: {
    id: string;
    name: string; // Assuming name is part of build details for the subtitle
    number: number;
    type: BuildType | null;
    commit?: string; // Kept as optional for cases where it might not be available
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
  automationContext: AutomationContext, // Updated parameter
): SlackMessageBlock[] {
  const commitShort = build.commit?.substring(0, 7);
  const buildUrl = `${project.url}/builds/${build.id}`;

  const blocks: SlackMessageBlock[] = [
    // Header block for the automation rule name
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Automation Triggered: "${automationContext.rule.name}"`,
        emoji: true, // Optional: adds a default emoji if available
      },
    },
    // Context block for subtitle (event description and build link)
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `${getEventDescription(automationContext.event)} (Build <${buildUrl}|#${build.number}: ${build.name}> on *${project.name}*)`,
        },
      ],
    },
    { type: "divider" },
    // Existing build details section
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Type:* ${build.type ?? "N/A"}` },
        { type: "mrkdwn", text: `*Commit:* ${commitShort ?? "N/A"}` },
        {
          type: "mrkdwn",
          text: `*Branch:* ${build.compareScreenshotBucket?.branch ?? "N/A"}`,
        },
        {
          type: "mrkdwn",
          text: `*Screenshots Compared:* ${build.compareScreenshotBucket?.screenshotCount ?? 0}`,
        },
      ],
    },
  ];

  // Optional: Add Pull Request information if available
  if (build.pullRequest?.number && build.pullRequest.title) {
    // Assuming pull request has a URL, construct it if not directly available or use a placeholder
    const prUrl = build.pullRequest.url || `https://github.com/pull/${build.pullRequest.number}`; // Example, adjust as needed
    blocks.push({
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Pull Request:* <${prUrl}|#${build.pullRequest.number}: ${build.pullRequest.title}>`,
        },
      ],
    });
  }

  // Keep the "View Build" button
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
        action_id: "view-build-button", // Changed action_id to be more descriptive
        style: "primary", // Optional: makes the button more prominent
      },
    ],
  });

  return blocks;
}
