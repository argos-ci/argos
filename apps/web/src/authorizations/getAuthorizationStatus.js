import { CONSISTENT, INCONSISTENT } from "./authorizationStatuses";
import { PRIVATE_SCOPES, PUBLIC_SCOPES, expandScopes } from "./scopes";

export function getAuthorizationStatus({ privateSync, githubScopes }) {
  const scopes = expandScopes(githubScopes || []);
  const requiredScopes = privateSync ? PRIVATE_SCOPES : PUBLIC_SCOPES;
  const inconsistent = requiredScopes.some((scope) => !scopes.includes(scope));
  return inconsistent ? INCONSISTENT : CONSISTENT;
}
