import type { EmailTemplate } from "../template";
import * as email_added from "./email_added";
import * as email_removed from "./email_removed";
import * as email_verification from "./email_verification";
import * as signin_attempt from "./signin_attempt";
import * as signin_verification from "./signin_verification";
import * as signup_signin_verification from "./signup_signin_verification";
import * as signup_verification from "./signup_verification";

export const emailTemplates = [
  email_added.handler,
  email_removed.handler,
  email_verification.handler,
  signin_attempt.handler,
  signin_verification.handler,
  signup_signin_verification.handler,
  signup_verification.handler,
] satisfies EmailTemplate[];

type AnyTemplate = (typeof emailTemplates)[number];
export type EmailTemplateType = AnyTemplate["type"];
type EmailTemplateData<TType extends EmailTemplateType> = Extract<
  AnyTemplate,
  { type: TType }
>["schema"]["_output"];

export type EmailTemplateProps<
  Type extends EmailTemplateType = EmailTemplateType,
> = {
  [E in EmailTemplateType]: { template: E; data: EmailTemplateData<E> };
}[Type];
