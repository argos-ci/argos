import { CONSISTENT, INVALID_TOKEN } from 'modules/authorizations/authorizationStatuses'
import githubClient from 'modules/authorizations/githubClient'
import { notFoundToken, validToken } from 'modules/authorizations/githubClientFixtures'
import checkAuthorization from './checkAuthorization'

jest.mock('modules/authorizations/githubClient')

describe('checkAuthorization', () => {
  describe('with a "Not found error" (code: 404)', () => {
    beforeEach(() => {
      githubClient.authorization.check.mockImplementation(notFoundToken())
    })

    it('should return status: INVALID_TOKEN with a 404 error', async () => {
      const result = await checkAuthorization({
        accessToken: 'my-token',
        privateSync: true,
      })

      expect(result).toEqual({ status: INVALID_TOKEN })
    })
  })

  describe('with a valid response', () => {
    beforeEach(() => {
      githubClient.authorization.check.mockImplementation(
        validToken({
          scopes: ['user:email', 'repo', 'read:org', 'orga'],
        })
      )
    })

    it('should return status: CONSISTENT with scopes', async () => {
      const result = await checkAuthorization({
        accessToken: 'my-token',
        privateSync: true,
      })

      expect(result).toEqual({
        status: CONSISTENT,
        scopes: ['user:email', 'repo', 'read:org', 'orga'],
      })
    })
  })
})
