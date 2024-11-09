import { SendEmailAction } from "./sendEmail";
import { PostInSlackChannelAction } from "./sendSlackMessage";

export type AutomationAction = PostInSlackChannelAction | SendEmailAction;
