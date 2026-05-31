import type { NotificationHandler } from "../workflow-types";
import * as comment_added from "./comment_added";
import * as comment_reaction from "./comment_reaction";
import * as email_added from "./email_added";
import * as email_removed from "./email_removed";
import * as invalid_gitlab_token from "./invalid_gitlab_token";
import * as project_deleted from "./project_deleted";
import * as review_dismissed from "./review_dismissed";
import * as review_submitted from "./review_submitted";
import * as saml_certificate_expiration from "./saml_certificate_expiration";
import * as slack_automation_action_unavailable from "./slack_automation_action_unavailable";
import * as spend_limit from "./spend_limit";
import * as welcome from "./welcome";

export const notificationHandlers = [
  comment_added.handler,
  comment_reaction.handler,
  email_added.handler,
  email_removed.handler,
  invalid_gitlab_token.handler,
  project_deleted.handler,
  review_dismissed.handler,
  review_submitted.handler,
  saml_certificate_expiration.handler,
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
