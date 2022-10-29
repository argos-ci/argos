import {
  AuthorizationStatus,
  CONSISTENT,
  INCONSISTENT,
} from "./authorizationStatuses.js";
import { PRIVATE_SCOPES, PUBLIC_SCOPES, expandScopes } from "./scopes.js";

export const getAuthorizationStatus = ({
  privateSync,
  githubScopes,
}: {
  privateSync: boolean;
  githubScopes: string[];
}): AuthorizationStatus => {
  const scopes = expandScopes(githubScopes);
  const requiredScopes = privateSync ? PRIVATE_SCOPES : PUBLIC_SCOPES;
  const inconsistent = requiredScopes.some((scope) => !scopes.includes(scope));
  return inconsistent ? INCONSISTENT : CONSISTENT;
};
