import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import {
  SlackChannel,
  type SlackInstallation,
} from "@/database/models/index.js";
import { UnretryableError } from "@/job-core";
import { postMessageToSlackChannel } from "@/slack";

import { AutomationActionFailureError } from "../../automationActionError";
import { defineAutomationAction } from "../../defineAutomationAction";
import { type AutomationMessage } from "../../types/events";
import { buildSlackMessage } from "./message";

const payloadSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
});
type Payload = z.infer<typeof payloadSchema>;

const payloadJsonSchema = z.toJSONSchema(payloadSchema);

type ExpandedPayload = {
  slackChannel: SlackChannel;
  slackInstallation: SlackInstallation;
};

/**
 * Expand the Slack payload.
 */
async function expandPayload(payload: Payload): Promise<ExpandedPayload> {
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

export const automationAction = defineAutomationAction({
  name: "sendSlackMessage",
  payloadSchema,
  payloadJsonSchema,
  process: async (input) => {
    const message: AutomationMessage = await (async () => {
      const actionRun = await input.ctx.automationActionRun.$fetchGraph(
        "automationRun.[build,buildReview]",
      );

      invariant(
        actionRun,
        "automationRun relation not found",
        UnretryableError,
      );

      invariant(
        actionRun.automationRun,
        "automationRun relation not found",
        UnretryableError,
      );

      switch (actionRun.automationRun.event) {
        case "build.completed": {
          invariant(
            actionRun.automationRun.build,
            "build relation not found",
            UnretryableError,
          );
          return {
            event: actionRun.automationRun.event,
            payload: { build: actionRun.automationRun.build },
          };
        }
        case "build.reviewed": {
          invariant(
            actionRun.automationRun.build,
            "build relation not found",
            UnretryableError,
          );
          invariant(
            actionRun.automationRun.buildReview,
            "buildReview relation not found",
            UnretryableError,
          );
          return {
            event: actionRun.automationRun.event,
            payload: {
              build: actionRun.automationRun.build,
              buildReview: actionRun.automationRun.buildReview,
            },
          };
        }
        default:
          assertNever(actionRun.automationRun.event);
      }
    })();

    await sendSlackMessage({ message, payload: input.payload });
  },
  test: async (input) => {
    await sendSlackMessage({ ...input, isTestMessage: true });
  },
});

/**
 * Send a Slack message for a given automation message.
 */
async function sendSlackMessage(args: {
  message: AutomationMessage;
  payload: Payload;
  isTestMessage?: boolean;
}): Promise<void> {
  const { message, payload, isTestMessage = false } = args;
  const [{ blocks, text }, richPayload] = await Promise.all([
    buildSlackMessage({ message, isTestMessage }),
    expandPayload(payload),
  ]);

  await postMessageToSlackChannel({
    installation: richPayload.slackInstallation,
    channel: richPayload.slackChannel.slackId,
    text,
    blocks,
  });
}
