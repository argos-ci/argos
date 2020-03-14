import { errorChecking } from './api'

describe('api', () => {
  describe('errorChecking', () => {
    it('should fall back to the code', () => {
      const status = 401
      const next = jest.fn()

      errorChecking(() => {
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
