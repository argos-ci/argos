import { z } from "zod";

import { MsTeamsWebhook } from "@/database/models";
import { postCardToMsTeamsWebhook } from "@/msteams/webhook";

import { AutomationActionFailureError } from "../../automationActionError";
import { defineAutomationAction } from "../../defineAutomationAction";
import { type AutomationMessage } from "../../types/events";
import { getAutomationMessage } from "../message";
import { buildMsTeamsCard } from "./card";

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
async function expandPayload(payload: Payload): Promise<MsTeamsWebhook> {
  const { webhookId } = payload;

  const webhook = await MsTeamsWebhook.query().findById(webhookId);

  if (!webhook) {
    throw new AutomationActionFailureError(
      `Microsoft Teams webhook removed ${webhookId}`,
    );
  }

  return webhook;
}

export const automationAction = defineAutomationAction({
  name: "sendMsTeamsMessage",
  payloadSchema,
  payloadJsonSchema,
  process: async (input) => {
    const message = await getAutomationMessage(input.ctx.automationActionRun);

    await sendMsTeamsMessage({ message, payload: input.payload });
  },
  test: async (input) => {
    await sendMsTeamsMessage({ ...input, isTestMessage: true });
  },
});

/**
 * Send a Microsoft Teams message for a given automation message.
 */
async function sendMsTeamsMessage(args: {
  message: AutomationMessage;
  payload: Payload;
  isTestMessage?: boolean;
}): Promise<void> {
  const { message, payload, isTestMessage = false } = args;
  const [card, webhook] = await Promise.all([
    buildMsTeamsCard({ message, isTestMessage }),
    expandPayload(payload),
  ]);

  await postCardToMsTeamsWebhook({ webhook, card });
}
