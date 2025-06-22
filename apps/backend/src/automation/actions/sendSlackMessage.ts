import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import {
  Build,
  SlackChannel,
  type GithubPullRequest,
  type Project,
  type ScreenshotBucket,
  type SlackInstallation,
} from "@/database/models/index.js";
import { UnretryableError } from "@/job-core";
import { postMessageToSlackChannel } from "@/slack";
import {
  getBuildStatusMessage,
  getEventDescription,
} from "@/slack/buildStatusMessage";
import { zodToJsonSchema } from "@/util/zod";

import { AutomationActionFailureError } from "../automationActionError";
import {
  AutomationActionContext,
  defineAutomationAction,
} from "../defineAutomationAction";
import type { AutomationEvent } from "../types/events";

const payloadSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
});
type Payload = z.infer<typeof payloadSchema>;

const payloadJsonSchema = zodToJsonSchema(payloadSchema, {
  removeAdditionalStrategy: "strict",
});

async function expandContext(context: AutomationActionContext) {
  const { automationActionRun } = context;
  const richActionRun = await automationActionRun.$clone().$fetchGraph(`
    [
      automationRun.[
        build.[
          compareScreenshotBucket,
          project.[
            githubRepository.[
              githubAccount
            ]
            gitlabProject
          ]
          pullRequest.[
            githubRepository.[
              githubAccount
            ]
          ]
        ]
        automationRule
      ],
    ]
  `);

  invariant(
    richActionRun.automationRun,
    "automationRun relation not found",
    UnretryableError,
  );

  invariant(
    richActionRun.automationRun.build,
    "build relation not found",
    UnretryableError,
  );

  invariant(
    richActionRun.automationRun.build.project,
    "project relation not found",
    UnretryableError,
  );

  const {
    build,
    event,
    build: { project, compareScreenshotBucket, pullRequest },
  } = richActionRun.automationRun;

  return {
    build,
    event,
    project,
    compareScreenshotBucket: compareScreenshotBucket ?? null,
    pullRequest: pullRequest ?? null,
  };
}

async function expandPayload(payload: Payload) {
  const { channelId } = payload;

  const slackChannel = await SlackChannel.query()
    .findById(channelId)
    .withGraphFetched("slackInstallation");

  if (!slackChannel) {
    throw new AutomationActionFailureError(
      `Slack channel removed ${channelId}`,
    );
  }

  invariant(
    slackChannel.slackInstallation,
    "slackInstallation relation not found",
    UnretryableError,
  );

  return { slackChannel, slackInstallation: slackChannel.slackInstallation };
}

async function sendSlackMessage(args: {
  build: Build;
  project: Project;
  compareScreenshotBucket: ScreenshotBucket | null;
  pullRequest: GithubPullRequest | null;
  slackChannel: SlackChannel;
  slackInstallation: SlackInstallation;
  event: AutomationEvent;
  isTestMessage?: boolean;
}): Promise<void> {
  const {
    build,
    project,
    compareScreenshotBucket,
    pullRequest,
    slackChannel,
    slackInstallation,
    event,
    isTestMessage,
  } = args;

  const [buildUrl, [status]] = await Promise.all([
    build.getUrl(),
    Build.getAggregatedBuildStatuses([build]),
  ]);

  invariant(status, "Status should be loaded");

  const blocks = getBuildStatusMessage({
    build,
    buildUrl,
    compareScreenshotBucket,
    project,
    pullRequest,
    status,
    isTestMessage,
  });

  await postMessageToSlackChannel({
    installation: slackInstallation,
    channel: slackChannel.slackId,
    text: getEventDescription(event),
    blocks,
  });
}

export const automationAction = defineAutomationAction({
  name: "sendSlackMessage",
  payloadSchema,
  payloadJsonSchema,
  process: async ({ payload, ctx }) => {
    const [expandedContext, expandedPayload] = await Promise.all([
      expandContext(ctx),
      expandPayload(payload),
    ]);

    await sendSlackMessage({
      ...expandedContext,
      ...expandedPayload,
    });
  },
  test: async ({ payload, event, eventPayload }) => {
    const expandedPayload = await expandPayload(payload);

    const build = "build" in eventPayload ? eventPayload.build : null;
    invariant(build, "Build is required for sendSlackMessage action");

    const richBuild = await build.$fetchGraph(`
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
    `);

    invariant(richBuild.project, "Project relation not found");

    await sendSlackMessage({
      ...expandedPayload,
      build,
      event,
      project: richBuild.project,
      compareScreenshotBucket: richBuild.compareScreenshotBucket ?? null,
      pullRequest: richBuild.pullRequest ?? null,
      isTestMessage: true,
    });
  },
});
