import { Resend } from "resend";

import config from "@/config/index.js";
import logger from "@/logger/index.js";

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
      return;
    }
  } else if (!resend) {
    return;
  }
  await resend.emails.send({ ...options, from: defaultFrom });
}
