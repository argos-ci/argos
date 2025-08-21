import type { NotificationHandler } from "../workflow-types";
import * as slack_automation_action_unavailable from "./slack_automation_action_unavailable";
import * as spend_limit from "./spend_limit";
import * as welcome from "./welcome";

export const notificationHandlers = [
  spend_limit.handler,
  welcome.handler,
  slack_automation_action_unavailable.handler,
] satisfies NotificationHandler[];

type AnyNotificationHandler = (typeof notificationHandlers)[number];
export type NotificationWorkflowType = AnyNotificationHandler["type"];
export type NotificationWorkflowData<TType extends NotificationWorkflowType> =
  Extract<AnyNotificationHandler, { type: TType }>["schema"]["_output"];

export function getHandler<TType extends NotificationWorkflowType>(
  type: TType,
): Extract<AnyNotificationHandler, { type: TType }> {
  const handler = notificationHandlers.find((h) => h.type === type);
  if (!handler) {
    throw new Error(`Handler not found: ${type}`);
  }
  return handler as Extract<NotificationWorkflowType, { type: TType }>;
}
