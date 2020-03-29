import { asyncHandler } from './util'

describe('util', () => {
  describe('#asyncHandler', () => {
    it('should fall back to the code', () => {
      const status = 401
      const next = jest.fn()

      asyncHandler(() => {
        const githubError = new Error('')
        githubError.code = status
        githubError.status = 'Unauthorized'
        throw githubError
      })(
        () => {},
        () => {},
        next,
      )

      expect(next.mock.calls[0][0].status).toBe(status)
    })
  })
})
