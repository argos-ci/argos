import config from "@argos-ci/config";

import { INVALID_TOKEN } from "./authorizationStatuses";
import { getAuthorizationStatus } from "./getAuthorizationStatus";
import { githubClient } from "./githubClient";

export async function checkAuthorization({ accessToken, privateSync }) {
  let authorization;

  try {
    authorization = await githubClient.apps.checkToken({
      access_token: accessToken,
      client_id: config.get("github.clientId"),
    });
  } catch (error) {
    if (error.status === 404) {
      return { status: INVALID_TOKEN };
    }

    throw error;
  }

  const {
    data: { scopes },
  } = authorization;
  const status = getAuthorizationStatus({ privateSync, githubScopes: scopes });
  return { scopes, status };
}
