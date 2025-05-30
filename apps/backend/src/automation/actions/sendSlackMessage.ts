import { invariant } from "@argos/util/invariant";
import { JSONSchema } from "objection";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

import { SlackChannel } from "@/database/models/index.js";
import { UnretryableError } from "@/job-core";
import { postMessageToSlackChannel } from "@/slack";
import {
  getBuildStatusMessage,
  getEventDescription,
} from "@/slack/buildStatusMessage";

import {
  AutomationActionContext,
  defineAutomationAction,
} from "../defineAutomationAction";

const payloadSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
});
type payload = z.infer<typeof payloadSchema>;

const payloadJsonSchema = zodToJsonSchema(payloadSchema, {
  removeAdditionalStrategy: "strict",
}) as JSONSchema;

export async function sendSlackMessage(
  props: payload & { ctx: AutomationActionContext },
): Promise<void> {
  const { channelId, ctx } = props;
  const { automationActionRun } = ctx;

  const [richActionRun, slackChannel] = await Promise.all([
    automationActionRun.$query().withGraphFetched(`
    [
      automationRun.[
        build.[
          compareScreenshotBucket,
          project
          pullRequest
        ]
        automationRule
      ],
    ]
  `),
    SlackChannel.query()
      .findById(channelId)
      .withGraphFetched("slackInstallation"),
  ]);

  invariant(richActionRun, "AutomationActionRun not found", UnretryableError);
  invariant(
    richActionRun.automationRun,
    "AutomationRun not found",
    UnretryableError,
  );
  invariant(
    richActionRun.automationRun.automationRule,
    "AutomationRule not found",
    UnretryableError,
  );
  invariant(
    richActionRun.automationRun.build,
    "Build not found",
    UnretryableError,
  );
  invariant(
    richActionRun.automationRun.build.project,
    "Project not found",
    UnretryableError,
  );
  invariant(
    richActionRun.automationRun.event,
    "AutomationEvent not found",
    UnretryableError,
  );

  if (!slackChannel) {
    throw new Error(`Slack channel removed ${channelId}`);
  }

  invariant(
    slackChannel.slackInstallation,
    `Slack installation not found for slack channel id ${slackChannel.id}`,
    UnretryableError,
  );

  const {
    build,
    event,
    build: { project, compareScreenshotBucket, pullRequest },
  } = richActionRun.automationRun;
  const { slackInstallation } = slackChannel;

  const buildUrl = await build.getUrl();

  const blocks = getBuildStatusMessage({
    build,
    buildUrl,
    compareScreenshotBucket,
    project,
    pullRequest,
    event,
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
  process: sendSlackMessage,
});
