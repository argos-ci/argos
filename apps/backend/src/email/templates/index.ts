import type { EmailTemplate } from "../template";
import * as email_added from "./email_added";
import * as email_removed from "./email_removed";
import * as email_verification from "./email_verification";

export const emailTemplates = [
  email_added.handler,
  email_removed.handler,
  email_verification.handler,
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
