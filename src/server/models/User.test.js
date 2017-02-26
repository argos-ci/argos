import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'

describe('User', () => {
  useDatabase()

  describe('#getUrlIdentifier', () => {
    let user

    beforeEach(async () => {
      user = await factory.create('User', { login: 'my-user' })
    })

    it('should return "login"', () => {
      expect(user.getUrlIdentifier()).toBe(user.login)
      expect(user.getUrlIdentifier()).toBe('my-user')
    })
  })
})
