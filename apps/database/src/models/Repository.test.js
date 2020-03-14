import { factory, useDatabase } from '../testing'

describe('Repository', () => {
  useDatabase()

  describe('#getUsers', () => {
    let user
    let repository

    beforeEach(async () => {
      user = await factory.create('User')
      repository = await factory.create('Repository')
      await factory.create('UserRepositoryRight', {
        userId: user.id,
        repositoryId: repository.id,
      })
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
