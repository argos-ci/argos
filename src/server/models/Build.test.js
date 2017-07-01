import { assert } from 'chai'
import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import { VALIDATION_STATUS } from 'server/constants'
import Build from './Build'

const baseData = {
  repositoryId: '1',
  baseScreenshotBucketId: '1',
  compareScreenshotBucketId: '2',
  jobStatus: 'pending',
}

describe('models/Build', () => {
  useDatabase()

  describe('create build', () => {
    it('should add a build number', async () => {
      const build1 = await factory.create('Build')
      const build2 = await factory.create('Build', { repositoryId: build1.repositoryId })
      expect(build1.number).toBe(1)
      expect(build2.number).toBe(2)
    })

    it('should be able to override the number', async () => {
      const build = await factory.create('Build', {
        number: 0,
      })
      expect(build.number).toBe(0)
    })
  })

  describe('patch build', () => {
    it('should not add a build number', async () => {
      const build = await factory.create('Build')
      expect(build.number).toBe(1)
      await build.$query().patch({ jobStatus: 'complete' })
      await build.reload()
      expect(build.number).toBe(1)
      expect(build.jobStatus).toBe('complete')
    })
  })

  describe('validation screenshotBucket', () => {
    it('should throw if the screenshot buckets are the same', () => {
      assert.throws(() => {
        Build.fromJson({
          ...baseData,
          compareScreenshotBucketId: '1',
        })
      }, 'The base screenshot bucket should be different to the compare one.')
    })

    it('should not throw if the screenshot buckets are different', () => {
      assert.doesNotThrow(() => {
        Build.fromJson(baseData)
      })
    })
  })

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
      expect(users.length === 1).toBe(true)
      expect(users[0].id).toBe(user.id)

      const staticUsers = await Build.getUsers(build.id)
      expect(staticUsers.length === 1).toBe(true)
      expect(staticUsers[0].id).toBe(user.id)
    })
  })

  describe('#getStatus', () => {
    let build

    describe('with all in pending', () => {
      it('should be pending', async () => {
        build = await factory.create('Build')
        await factory.create('ScreenshotDiff', { buildId: build.id, jobStatus: 'pending' })
        await factory.create('ScreenshotDiff', { buildId: build.id, jobStatus: 'pending' })
        expect(await build.getStatus()).toBe('pending')
      })
    })

    describe('with one in progress', () => {
      it('should be progress', async () => {
        build = await factory.create('Build')
        await factory.create('ScreenshotDiff', { buildId: build.id, jobStatus: 'pending' })
        await factory.create('ScreenshotDiff', { buildId: build.id, jobStatus: 'progress' })
        expect(await build.getStatus()).toBe('progress')
      })
    })

    describe('with all in complete, some score > 0', () => {
      it('should be failure', async () => {
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
        expect(await build.getStatus()).toBe('failure')
      })
    })

    describe('with all in complete, every score == 0', () => {
      it('should be success', async () => {
        build = await factory.create('Build', {
          jobStatus: 'complete',
        })
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
        expect(await Build.getStatus(build)).toBe('success')
      })
    })

    describe('with the validationStatus', () => {
      beforeEach(async () => {
        build = await factory.create('Build')
      })

      it('should be failure n°1', async () => {
        await factory.create('ScreenshotDiff', {
          buildId: build.id,
          jobStatus: 'complete',
          score: 0,
          validationStatus: VALIDATION_STATUS.rejected,
        })
        expect(
          await build.getStatus({
            useValidation: true,
          })
        ).toBe('failure')
      })

      it('should be failure n°2', async () => {
        await factory.create('ScreenshotDiff', {
          buildId: build.id,
          jobStatus: 'complete',
          score: 1,
          validationStatus: VALIDATION_STATUS.unknown,
        })
        expect(
          await build.getStatus({
            useValidation: true,
          })
        ).toBe('failure')
      })

      it('should be success', async () => {
        await factory.create('ScreenshotDiff', {
          buildId: build.id,
          jobStatus: 'complete',
          score: 0.2,
          validationStatus: VALIDATION_STATUS.accepted,
        })
        expect(
          await build.getStatus({
            useValidation: true,
          })
        ).toBe('success')
      })
    })

    describe('with an error build', () => {
      it('should be error', async () => {
        build = await factory.create('Build', {
          jobStatus: 'error',
        })
        expect(await build.getStatus()).toBe('error')
      })
    })
  })
})
