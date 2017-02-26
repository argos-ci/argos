import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import Organization from 'server/models/Organization'
import User from 'server/models/User'

describe('Repository', () => {
  useDatabase()

  describe('#getOwner', () => {
    let repository

    describe('with an organization', () => {
      let organization

      beforeEach(async () => {
        organization = await factory.create('Organization')
        repository = await factory.create('Repository', {
          organizationId: organization.id,
          userId: null,
        })
      })

      it('should return it', async () => {
        const owner = await repository.getOwner()
        expect(owner.id).toBe(organization.id)
        expect(owner instanceof Organization).toBe(true)
      })
    })

    describe('with an user', () => {
      let user

      beforeEach(async () => {
        user = await factory.create('User')
        repository = await factory.create('Repository', {
          organizationId: null,
          userId: user.id,
        })
      })

      it('should return it', async () => {
        const owner = await repository.getOwner()
        expect(owner.id).toBe(user.id)
        expect(owner instanceof User).toBe(true)
      })
    })
  })
})
