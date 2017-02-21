import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'

describe('ScreenshotBucket', () => {
  describe('#baseScreenshotBucket', () => {
    useDatabase()
    let testBucket
    let masterBucket

    beforeEach(async () => {
      const repository = await factory.create('Repository')
      testBucket = await factory.create('ScreenshotBucket', {
        name: 'test-bucket',
        branch: 'test-branch',
        repositoryId: repository.id,
      })
      masterBucket = await factory.create('ScreenshotBucket', {
        name: 'master-bucket',
        branch: 'master',
        repositoryId: repository.id,
      })
    })

    it('should return the bucket with a branch "master", same repository', async () => {
      const baseScreenshotBucket = await testBucket.baseScreenshotBucket()
      expect(baseScreenshotBucket.name).toBe('master-bucket')
    })

    it('should not return himself', async () => {
      const baseScreenshotBucket = await masterBucket.baseScreenshotBucket()
      expect(baseScreenshotBucket).toBeNull()
    })
  })
})
