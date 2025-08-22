import { sendEmail } from "./send";
import {
  emailTemplates,
  type EmailTemplateProps,
  type EmailTemplateType,
} from "./templates";

/**
 * Sends an email using the specified template and data.
 * @param input The input parameters for sending the email.
 */
export async function sendEmailTemplate<Type extends EmailTemplateType>(
  input: EmailTemplateProps<Type> & {
    to: string[];
  },
) {
  const template = emailTemplates.find((h) => h.type === input.template);
  if (!template) {
    throw new Error(`Handler not found: ${input.template}`);
  }
  const rendered = template.email(input.data as any);
  await sendEmail({
    to: input.to,
    react: rendered.body,
    subject: rendered.subject,
  });
}
