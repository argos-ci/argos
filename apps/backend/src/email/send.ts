import { render } from "react-email";
import { Resend } from "resend";

import config from "@/config";
import logger from "@/logger";

const production = config.get("env") === "production";
const resendApiKey = config.get("resend.apiKey");

// Resend throws if API key is missing
// It is tolerable in test and development but not in production
const resend =
  resendApiKey || production ? new Resend(config.get("resend.apiKey")) : null;

const defaultFrom = "Argos <contact@argos-ci.com>";

/**
 * Send an email using Resend.
 */
export async function sendEmail(options: {
  /**
   * Email address to send to.
   */
  to: string[];
  /**
   * Email subject.
   */
  subject: string;
  /**
   * Email body as React element.
   */
  react: React.ReactElement;
  headers?: Record<string, string> | undefined;
  /**
   * Sending again with the same key within a day sends nothing more, so a job
   * can retry an email that may already have gone out.
   */
  idempotencyKey?: string | undefined;
}) {
  if (production) {
    if (!resend) {
      logger.error("Resend API key is missing");
      return null;
    }
  } else if (!resend) {
    return null;
  }
  const { idempotencyKey, headers = {}, ...email } = options;
  const text = await render(email.react, { plainText: true });
  const result = await resend.emails.send(
    { ...email, headers, text, from: defaultFrom },
    idempotencyKey ? { idempotencyKey } : {},
  );
  // Resend reports a failure in the result instead of throwing.
  if (result.error) {
    throw new Error(`Resend failed to send an email: ${result.error.message}`);
  }
  return result;
}
