import type { NotificationHandler } from "../workflow-types";
import * as invalid_gitlab_token from "./invalid_gitlab_token";
import * as slack_automation_action_unavailable from "./slack_automation_action_unavailable";
import * as spend_limit from "./spend_limit";
import * as welcome from "./welcome";

export const notificationHandlers = [
  invalid_gitlab_token.handler,
  spend_limit.handler,
  welcome.handler,
  slack_automation_action_unavailable.handler,
] satisfies NotificationHandler[];

type AnyNotificationHandler = (typeof notificationHandlers)[number];
export type NotificationWorkflowType = AnyNotificationHandler["type"];
type NotificationWorkflowData<TType extends NotificationWorkflowType> = Extract<
  AnyNotificationHandler,
  { type: TType }
>["schema"]["_output"];

export type NotificationWorkflowProps<
  Type extends NotificationWorkflowType = NotificationWorkflowType,
> = {
  [E in NotificationWorkflowType]: {
    type: E;
    data: NotificationWorkflowData<E>;
  };
}[Type];
