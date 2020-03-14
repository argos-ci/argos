import { expandScopes, PRIVATE_SCOPES, PUBLIC_SCOPES } from './scopes'
import { CONSISTENT, INCONSISTENT } from './authorizationStatuses'

export function getAuthorizationStatus({ privateSync, githubScopes }) {
  const scopes = expandScopes(githubScopes || [])
  const requiredScopes = privateSync ? PRIVATE_SCOPES : PUBLIC_SCOPES
  const inconsistent = requiredScopes.some(scope => !scopes.includes(scope))
  return inconsistent ? INCONSISTENT : CONSISTENT
}
