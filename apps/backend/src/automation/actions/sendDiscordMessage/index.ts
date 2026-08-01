import { z } from "zod";

import { DiscordWebhook } from "@/database/models";
import { postEmbedToDiscordWebhook } from "@/discord/webhook";

import { AutomationActionFailureError } from "../../automationActionError";
import { defineAutomationAction } from "../../defineAutomationAction";
import { type AutomationMessage } from "../../types/events";
import { getAutomationMessage } from "../message";
import { buildDiscordEmbed } from "./embed";

const payloadSchema = z.object({
  webhookId: z.string().min(1, "Webhook ID is required"),
});
type Payload = z.infer<typeof payloadSchema>;

// `io: "input"` keeps the schema permissive about unknown keys, matching how
// payloads were validated before this action existed.
const payloadJsonSchema = z.toJSONSchema(payloadSchema, { io: "input" });

/**
 * Resolve the webhook referenced by the payload.
 */
async function expandPayload(payload: Payload): Promise<DiscordWebhook> {
  const { webhookId } = payload;

  const webhook = await DiscordWebhook.query().findById(webhookId);

  if (!webhook) {
    throw new AutomationActionFailureError(
      `Discord webhook removed ${webhookId}`,
    );
  }

  return webhook;
}

export const automationAction = defineAutomationAction({
  name: "sendDiscordMessage",
  payloadSchema,
  payloadJsonSchema,
  process: async (input) => {
    const message = await getAutomationMessage(input.ctx.automationActionRun);

    await sendDiscordMessage({ message, payload: input.payload });
  },
  test: async (input) => {
    await sendDiscordMessage({ ...input, isTestMessage: true });
  },
});

/**
 * Send a Discord message for a given automation message.
 */
async function sendDiscordMessage(args: {
  message: AutomationMessage;
  payload: Payload;
  isTestMessage?: boolean;
}): Promise<void> {
  const { message, payload, isTestMessage = false } = args;
  const [embed, webhook] = await Promise.all([
    buildDiscordEmbed({ message, isTestMessage }),
    expandPayload(payload),
  ]);

  await postEmbedToDiscordWebhook({ webhook, embed });
}
