import { setTimeout as sleep } from "node:timers/promises";
import { render } from "react-email";
import { Resend } from "resend";

import config from "@/config";
import { UnretryableError } from "@/job-core";
import logger from "@/logger";

const production = config.get("env") === "production";
const resendApiKey = config.get("resend.apiKey");

// Resend throws if API key is missing
// It is tolerable in test and development but not in production
const resend =
  resendApiKey || production ? new Resend(config.get("resend.apiKey")) : null;

const defaultFrom = "Argos <contact@argos-ci.com>";

const MAX_ATTEMPTS = 5;

/**
 * Longest rate-limit wait accepted before giving up. Some emails are sent while
 * an HTTP request waits on them (sign-in codes), so we cannot wait long; a job
 * that gives up is retried later by its own backoff.
 */
const MAX_RATE_LIMIT_DELAY = 5_000;

/**
 * Send an email using Resend.
 * Retries when Resend rate limits the request, waiting as long as its headers
 * ask.
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
  const { idempotencyKey, ...email } = options;
  const text = await render(email.react, { plainText: true });
  for (let attempt = 1; ; attempt++) {
    const result = await resend.emails.send(
      { ...email, text, from: defaultFrom },
      idempotencyKey ? { idempotencyKey } : {},
    );
    // Resend reports a failure in the result instead of throwing.
    if (!result.error) {
      return result;
    }
    const { name, message, statusCode } = result.error;

    // Daily and monthly quota errors are 429s too, but they only clear at the
    // next quota reset, so waiting here would be pointless.
    const delay =
      name === "rate_limit_exceeded" && attempt < MAX_ATTEMPTS
        ? getRateLimitDelay(result.headers)
        : null;
    if (delay !== null) {
      logger.info({ attempt, delay }, "Resend rate limit exceeded, retrying");
      await sleep(delay);
      continue;
    }

    // A request Resend rejects fails the same way when retried. A conflict, a
    // rate limit, an outage or a network error may not.
    const rejected =
      statusCode !== null &&
      statusCode >= 400 &&
      statusCode < 500 &&
      statusCode !== 409 &&
      statusCode !== 429;
    const ErrorClass = rejected ? UnretryableError : Error;
    throw new ErrorClass(`Resend failed to send an email: ${message}`);
  }
}

/**
 * Milliseconds to wait before retrying a rate-limited request, or `null` if
 * Resend asks for a longer wait than we accept.
 */
function getRateLimitDelay(
  headers: Record<string, string> | null,
): number | null {
  const seconds =
    parseSeconds(headers?.["retry-after"]) ??
    parseSeconds(headers?.["ratelimit-reset"]) ??
    1;
  const delay = seconds * 1000;
  if (delay > MAX_RATE_LIMIT_DELAY) {
    return null;
  }
  // Every sender rejected in the same window is told the same wait. Without
  // jitter they all retry at the same instant and get rejected together again.
  // The limit is per second, so spreading them over one second is enough.
  return delay + Math.random() * 1000;
}

function parseSeconds(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}
