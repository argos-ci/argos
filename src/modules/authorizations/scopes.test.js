import { PUBLIC_SCOPES, PRIVATE_SCOPES, expandScopes } from './scopes'

describe('expandScopes', () => {
  it('should expand scopes', () => {
    expect(expandScopes(PUBLIC_SCOPES)).toEqual(['user:email', 'repo:status', 'read:org'])
    expect(expandScopes(PRIVATE_SCOPES)).toEqual(['user:email', 'repo', 'repo:status', 'read:org'])
  })
})
