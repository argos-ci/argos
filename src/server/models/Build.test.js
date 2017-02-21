import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import Build from './Build'

describe('Build', () => {
  useDatabase()

  describe('#getUsers', () => {
    let user
    let build

    beforeEach(async () => {
      user = await factory.create('User')
      const repository = await factory.create('Repository')
      await factory.create('UserRepositoryRight', { userId: user.id, repositoryId: repository.id })
      build = await factory.create('Build', { repositoryId: repository.id })
    })

    it('should return users having rights on the repository', async () => {
      const users = await build.getUsers()
      expect(users.length === 1).toBeTruthy()
      expect(users[0].id).toBe(user.id)

      const staticUsers = await Build.getUsers(build.id)
      expect(staticUsers.length === 1).toBeTruthy()
      expect(staticUsers[0].id).toBe(user.id)
    })
  })

  describe('#getStatus', () => {
    let build

    describe('with all in pending', () => {
      beforeEach(async () => {
        build = await factory.create('Build')
        await factory.create('ScreenshotDiff', { buildId: build.id, jobStatus: 'pending' })
        await factory.create('ScreenshotDiff', { buildId: build.id, jobStatus: 'pending' })
      })

      it('should be pending', async () => {
        expect(await build.getStatus()).toBe('pending')
      })
    })

    describe('with one in progress', () => {
      beforeEach(async () => {
        build = await factory.create('Build')
        await factory.create('ScreenshotDiff', { buildId: build.id, jobStatus: 'pending' })
        await factory.create('ScreenshotDiff', { buildId: build.id, jobStatus: 'progress' })
      })

      it('should be progress', async () => {
        expect(await build.getStatus()).toBe('progress')
      })
    })

    describe('with all in complete, some score > 0', () => {
      beforeEach(async () => {
        build = await factory.create('Build')
        await factory.create('ScreenshotDiff', {
          buildId: build.id,
          jobStatus: 'complete',
          score: 10,
        })
        await factory.create('ScreenshotDiff', {
          buildId: build.id,
          jobStatus: 'complete',
          score: 0,
        })
      })

      it('should be failure', async () => {
        expect(await build.getStatus()).toBe('failure')
      })
    })

    describe('with all in complete, every score == 0', () => {
      beforeEach(async () => {
        build = await factory.create('Build')
        await factory.create('ScreenshotDiff', {
          buildId: build.id,
          jobStatus: 'complete',
          score: 0,
        })
        await factory.create('ScreenshotDiff', {
          buildId: build.id,
          jobStatus: 'complete',
          score: 0,
        })
      })

      it('should be success', async () => {
        expect(await Build.getStatus(build.id)).toBe('success') // static
        expect(await build.getStatus()).toBe('success') // instance
      })
    })
  })
})
