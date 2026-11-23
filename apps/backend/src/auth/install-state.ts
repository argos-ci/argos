import jwt from "jsonwebtoken";
import { z } from "zod";

import config from "@/config";

/**
 * The `state` Argos puts in an app install URL (Cursor Origin, the GitHub
 * light app) and reads back when the provider sends the user back. It names
 * the Argos account the installation is for.
 *
 * Signed, so only an install URL Argos produced for an account admin links an
 * installation to that account: the callback runs on the API host without the
 * session cookie, and the provider does not tell us who approved the install.
 * Each flow has its own audience, so a state from one never links the other.
 */

type InstallStateAudience = "origin-install" | "github-light-install";

const TTL_SECONDS = 60 * 60;

const StateSchema = z.object({
  accountId: z.string(),
});

type InstallState = z.infer<typeof StateSchema>;

export function signInstallState(
  audience: InstallStateAudience,
  state: InstallState,
): string {
  return jwt.sign(state, config.get("session.secret"), {
    algorithm: "HS256",
    audience,
    expiresIn: TTL_SECONDS,
  });
}

/**
 * Read a state back, `null` when it was not signed by us for this audience or
 * has expired.
 */
export function verifyInstallState(
  audience: InstallStateAudience,
  token: string,
): InstallState | null {
  try {
    const payload = jwt.verify(token, config.get("session.secret"), {
      algorithms: ["HS256"],
      audience,
    });
    return StateSchema.parse(payload);
  } catch {
    return null;
  }
}
