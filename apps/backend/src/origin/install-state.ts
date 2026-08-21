import jwt from "jsonwebtoken";
import { z } from "zod";

import config from "@/config";

/**
 * The `state` Argos puts in the Origin install URL and reads back from the
 * installation receipt. It names the Argos account the installation is for.
 *
 * Signed, so only an install URL Argos produced for an account admin links an
 * installation to that account: the callback runs on the API host without the
 * session cookie, and Origin does not tell us who approved the install.
 */

const TTL_SECONDS = 60 * 60;
const AUDIENCE = "origin-install";

const StateSchema = z.object({
  accountId: z.string(),
});

export type OriginInstallState = z.infer<typeof StateSchema>;

export function signOriginInstallState(state: OriginInstallState): string {
  return jwt.sign(state, config.get("session.secret"), {
    algorithm: "HS256",
    audience: AUDIENCE,
    expiresIn: TTL_SECONDS,
  });
}

/**
 * Read a state back, `null` when it was not signed by us or has expired.
 */
export function verifyOriginInstallState(
  token: string,
): OriginInstallState | null {
  try {
    const payload = jwt.verify(token, config.get("session.secret"), {
      algorithms: ["HS256"],
      audience: AUDIENCE,
    });
    return StateSchema.parse(payload);
  } catch {
    return null;
  }
}
