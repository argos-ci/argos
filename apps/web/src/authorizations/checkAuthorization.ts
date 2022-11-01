import config from "@argos-ci/config";

import { INVALID_TOKEN } from "./authorizationStatuses.js";
import type { AuthorizationStatus } from "./authorizationStatuses.js";
import { getAuthorizationStatus } from "./getAuthorizationStatus.js";
import { githubClient } from "./githubClient.js";

export const checkAuthorization = async ({
  accessToken,
  privateSync,
}: {
  accessToken: string;
  privateSync: boolean;
}): Promise<{ status: AuthorizationStatus; scopes?: string[] }> => {
  let authorization;

  try {
    authorization = await githubClient.apps.checkToken({
      access_token: accessToken,
      client_id: config.get("github.clientId"),
    });
  } catch (error: any) {
    if (error.status === 404) {
      return { status: INVALID_TOKEN };
    }

    throw error;
  }

  const scopes = authorization.data.scopes ?? [];
  const status = getAuthorizationStatus({ privateSync, githubScopes: scopes });
  return { scopes, status };
};
