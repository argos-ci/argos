import { spy } from 'sinon'
import { errorChecking } from './api'

describe('api', () => {
  describe('errorChecking', () => {
    it('should fall back to the code', () => {
      const status = 401
      const next = spy()

      errorChecking(() => {
        const githubError = new Error('')
        githubError.code = status
        githubError.status = 'Unauthorized'
        throw githubError
      })(() => {}, () => {}, next)

      expect(next.args[0][0].status).toBe(status)
    })
  })
})
