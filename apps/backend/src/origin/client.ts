import { assertNever } from "@argos/util/assertNever";

import { OriginInstallation } from "@/database/models";

import { OriginApi } from "./api";
import { checkOriginErrorStatus } from "./error";
import { signAppJwt } from "./jwt";

/**
 * Get an API client authenticated as the Argos Origin app.
 */
export function getAppOriginApi(): OriginApi {
  return new OriginApi(signAppJwt());
}

/**
 * Get an API client authenticated as an installation of the app.
 *
 * Reuses the token cached on the installation while it is fresh, mints a new
 * one otherwise. Returns `null` when the installation no longer exists on
 * Origin — the row is then marked deleted, like `getInstallationOctokit`.
 */
export async function getInstallationOriginApi(
  installation: OriginInstallation,
): Promise<OriginApi | null> {
  if (installation.token && installation.tokenExpiresAt) {
    const expiresAt = new Date(installation.tokenExpiresAt).getTime();
    // Tokens live 15 minutes at most; a minute of margin covers a slow job.
    const isExpired = expiresAt < Date.now() + 60 * 1000;
    if (!isExpired) {
      return new OriginApi(installation.token);
    }
  }

  const result = await authInstallation(installation.originId);
  switch (result.status) {
    case "deleted": {
      await OriginInstallation.query().findById(installation.id).patch({
        deleted: true,
        token: null,
        tokenExpiresAt: null,
      });
      return null;
    }
    case "authenticated": {
      await OriginInstallation.query().findById(installation.id).patch({
        deleted: false,
        token: result.token,
        tokenExpiresAt: result.expiresAt,
      });
      return new OriginApi(result.token);
    }
    default:
      assertNever(result);
  }
}

async function authInstallation(
  originId: string,
): Promise<
  | { status: "deleted" }
  | { status: "authenticated"; token: string; expiresAt: string }
> {
  try {
    const { token, expiresAt } =
      await getAppOriginApi().createInstallationAccessToken(originId);
    return { status: "authenticated", token, expiresAt };
  } catch (error) {
    // A removed installation cannot mint tokens anymore.
    if (checkOriginErrorStatus(404, error)) {
      return { status: "deleted" };
    }
    throw error;
  }
}
