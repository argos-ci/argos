import { useDatabase } from 'server/test/utils'
import ScreenshotBucket from './ScreenshotBucket'
import Repository from './Repository'

describe('ScreenshotBucket', () => {
  describe('#baseScreenshotBucket', () => {
    useDatabase()

    beforeEach(async () => {
      const repository = await Repository.query().insert({
        name: 'foo',
        githubId: 12,
        enabled: true,
        token: 'xx',
      })

      await ScreenshotBucket.query()
        .insert([
          {
            id: 1,
            name: 'test-bucket',
            commit: 'a',
            branch: 'test-branch',
            repositoryId: repository.id,
          },
          {
            id: 2,
            name: 'base-bucket',
            commit: 'b',
            branch: 'master',
            repositoryId: repository.id,
          },
        ])
    })

    it('should return the bucket with a branch "master", same repository', async () => {
      const bucket = await ScreenshotBucket.query().findById(1)
      const baseScreenshotBucket = await bucket.baseScreenshotBucket()
      expect(baseScreenshotBucket.name).toBe('base-bucket')
    })
  })
})
