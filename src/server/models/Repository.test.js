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

  describe('#getUsers', () => {
    let user
    let repository

    beforeEach(async () => {
      user = await factory.create('User')
      repository = await factory.create('Repository')
      await factory.create('UserRepositoryRight', { userId: user.id, repositoryId: repository.id })
    })

    it('should return users having rights on the repository', async () => {
      const users = await repository.getUsers()
      expect(users.length === 1).toBeTruthy()
      expect(users[0].id).toBe(user.id)

      const staticUsers = await repository.getUsers(repository.id)
      expect(staticUsers.length === 1).toBeTruthy()
      expect(staticUsers[0].id).toBe(user.id)
    })
  })
})
