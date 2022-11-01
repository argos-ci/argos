import {
  CONSISTENT,
  INCONSISTENT,
  INVALID_TOKEN,
} from "./authorizationStatuses.js";
import { checkAuthorization } from "./checkAuthorization.js";

export const getUserAuthorizationState = async ({
  accessToken,
  privateSync,
  previousAccessToken,
}: {
  accessToken: string;
  privateSync: boolean;
  previousAccessToken?: string;
}) => {
  const authorization = await checkAuthorization({ accessToken, privateSync });
  switch (authorization.status) {
    case INVALID_TOKEN:
      throw new Error("Access token is invalid");
    case CONSISTENT:
      return {
        accessToken,
        githubScopes: authorization.scopes,
      };
    case INCONSISTENT: {
      if (!previousAccessToken) {
        return {
          accessToken,
          githubScopes: authorization.scopes,
        };
      }

      const previousAuthorization = await checkAuthorization({
        accessToken: previousAccessToken,
        privateSync,
      });
      switch (previousAuthorization.status) {
        case CONSISTENT:
          return {
            githubScopes: previousAuthorization.scopes,
          };
        case INCONSISTENT:
        case INVALID_TOKEN:
          return {
            accessToken,
            githubScopes: authorization.scopes,
          };
        default:
          throw new Error("Invalid authorization");
      }
    }
    default:
      throw new Error("Invalid authorization");
  }
};
