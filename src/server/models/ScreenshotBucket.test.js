import { useDatabase } from 'server/testUtils'
import ScreenshotBucket from './ScreenshotBucket'

describe('ScreenshotBucket', () => {
  describe('#baseScreenshotBucket', () => {
    useDatabase()

    beforeEach(async () => {
      await ScreenshotBucket.query()
        .insert([
          {
            id: 1,
            name: 'test-bucket',
            commit: 'a',
            branch: 'test-branch',
          },
          {
            id: 2,
            name: 'base-bucket',
            commit: 'b',
            branch: 'master',
          },
        ])
    })

    it('should return the bucket with a branch "master"', async () => {
      const bucket = await ScreenshotBucket.query().findById(1)
      const baseScreenshotBucket = await bucket.baseScreenshotBucket()
      expect(baseScreenshotBucket.name).toBe('base-bucket')
    })
  })
})
