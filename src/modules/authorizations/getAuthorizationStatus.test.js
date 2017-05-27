import { PRIVATE_SCOPES, PUBLIC_SCOPES } from 'modules/authorizations/scopes'
import { CONSISTENT, INCONSISTENT } from 'modules/authorizations/authorizationStatuses'
import getAuthorizationStatus from './getAuthorizationStatus'

describe('getAuthorizationStatus', () => {
  it('should be consistent with privateSync: true and private scopes', () => {
    expect(
      getAuthorizationStatus({
        privateSync: true,
        githubScopes: PRIVATE_SCOPES,
      })
    ).toBe(CONSISTENT)
  })

  it('should be inconsistent with privateSync: true and public scopes', () => {
    expect(
      getAuthorizationStatus({
        privateSync: true,
        githubScopes: PUBLIC_SCOPES,
      })
    ).toBe(INCONSISTENT)
  })

  it('should be consistent with privateSync: false and private scopes', () => {
    expect(
      getAuthorizationStatus({
        privateSync: false,
        githubScopes: PRIVATE_SCOPES,
      })
    ).toBe(CONSISTENT)
  })

  it('should be consistent with privateSync: false and public scopes', () => {
    expect(
      getAuthorizationStatus({
        privateSync: false,
        githubScopes: PUBLIC_SCOPES,
      })
    ).toBe(CONSISTENT)
  })
})
