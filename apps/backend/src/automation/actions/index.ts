import type { AutomationActionType } from "@argos/schemas/automation-action";
import { z } from "zod";

import type { AutomationAction } from "../defineAutomationAction";
import * as sendSlackMessage from "./sendSlackMessage";

const AUTOMATION_ACTIONS = [
  sendSlackMessage.automationAction,
] satisfies AutomationAction<string, any>[];

export const AutomationActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal(sendSlackMessage.automationAction.name),
    actionPayload: sendSlackMessage.automationAction.payloadSchema,
  }),
]);

export const AutomatedActionJSONSchema = z.toJSONSchema(
  AutomationActionSchema,
  { io: "input" },
);

export type AutomationActionTypeDef = z.infer<typeof AutomationActionSchema>;

type AutomationActionsTypeDef = (typeof AUTOMATION_ACTIONS)[number];

export function getAutomationAction<T extends AutomationActionType>(
  name: T,
): Extract<AutomationActionsTypeDef, { name: T }> {
  const handler = AUTOMATION_ACTIONS.find((action) => action.name === name);
  if (!handler) {
    throw new Error(`AutomationAction not found: ${name}`);
  }
  return handler as Extract<AutomationActionsTypeDef, { name: T }>;
}
