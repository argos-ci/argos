import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'

describe('Organization', () => {
  useDatabase()

  describe('#getUrlIdentifier', () => {
    let organization

    beforeEach(async () => {
      organization = await factory.create('Organization', { name: 'my-orga' })
    })

    it('should return "name"', () => {
      expect(organization.getUrlIdentifier()).toBe(organization.name)
      expect(organization.getUrlIdentifier()).toBe('my-orga')
    })
  })
})
