import jwt from "jsonwebtoken";
import { z } from "zod";

import config from "@/config";

/**
 * The token of the unsubscribe link in the monthly report. It names the owner
 * and the team the email went to, so the link works without a session: it is
 * opened from a mail client, often on a device that is not signed in.
 *
 * Long-lived, because the email stays in an inbox and turning the report off
 * is all the token can do.
 */

const TTL_SECONDS = 365 * 24 * 60 * 60;
const AUDIENCE = "monthly-report-unsubscribe";

const TokenSchema = z.object({
  userId: z.string(),
  teamAccountId: z.string(),
});

type MonthlyReportUnsubscribeToken = z.infer<typeof TokenSchema>;

function signMonthlyReportUnsubscribeToken(
  payload: MonthlyReportUnsubscribeToken,
): string {
  return jwt.sign(payload, config.get("session.secret"), {
    algorithm: "HS256",
    audience: AUDIENCE,
    expiresIn: TTL_SECONDS,
  });
}

export function getMonthlyReportUnsubscribeUrl(
  payload: MonthlyReportUnsubscribeToken,
): string {
  const url = new URL("/unsubscribe/monthly-report", config.get("server.url"));
  url.searchParams.set("token", signMonthlyReportUnsubscribeToken(payload));
  return url.href;
}

/**
 * Read a token back, `null` when it was not signed by us or has expired.
 */
export function verifyMonthlyReportUnsubscribeToken(
  token: string,
): MonthlyReportUnsubscribeToken | null {
  try {
    const payload = jwt.verify(token, config.get("session.secret"), {
      algorithms: ["HS256"],
      audience: AUDIENCE,
    });
    return TokenSchema.parse(payload);
  } catch {
    return null;
  }
}
