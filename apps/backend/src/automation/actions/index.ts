import { AutomationAction } from "../defineAutomationAction";
import * as sendSlackMessage from "./sendSlackMessage";

export const AUTOMATION_ACTIONS = [
  sendSlackMessage.automationAction,
] satisfies AutomationAction<string, any>[];

type AutomationActionsType = (typeof AUTOMATION_ACTIONS)[number];

export type AutomationActionsName = AutomationActionsType["name"];

export type GetActionPayload<T extends AutomationActionsName> = Extract<
  AutomationActionsType,
  { name: T }
>["payloadSchema"]["_output"];

export function getAutomationAction<T extends AutomationActionsName>(
  name: T,
): Extract<AutomationActionsType, { name: T }> {
  const handler = AUTOMATION_ACTIONS.find((action) => action.name === name);
  if (!handler) {
    throw new Error(`AutomationAction not found: ${name}`);
  }
  return handler as Extract<AutomationActionsType, { name: T }>;
}
