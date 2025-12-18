import { render } from "@react-email/render";
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
}) {
  if (production) {
    if (!resend) {
      logger.error("Resend API key is missing");
      return null;
    }
  } else if (!resend) {
    return null;
  }
  const text = await render(options.react, { plainText: true });
  return resend.emails.send({ ...options, text, from: defaultFrom });
}
