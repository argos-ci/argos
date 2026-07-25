import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import { SlackChannel, type SlackInstallation } from "@/database/models";
import { UnretryableError } from "@/job-core";
import { postMessageToSlackChannel } from "@/slack/channel";

import { AutomationActionFailureError } from "../../automationActionError";
import { defineAutomationAction } from "../../defineAutomationAction";
import { type AutomationMessage } from "../../types/events";
import { getAutomationMessage } from "../message";
import { buildSlackMessage } from "./message";

const payloadSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
});
type Payload = z.infer<typeof payloadSchema>;

// `io: "input"` keeps the schema permissive about unknown keys, matching how
// payloads were validated before this action existed.
const payloadJsonSchema = z.toJSONSchema(payloadSchema, { io: "input" });

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
    .findOne({ slackId: channelId })
    .withGraphFetched("slackInstallation");

  if (!slackChannel) {
    throw new AutomationActionFailureError(
      `Slack channel removed ${channelId}`,
    );
  }

  if (slackChannel.archived) {
    throw new AutomationActionFailureError(
      `Slack channel archived ${channelId}`,
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
    const message = await getAutomationMessage(input.ctx.automationActionRun);

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
