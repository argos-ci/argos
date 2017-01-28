import { useDatabase } from 'server/testUtils'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import createBucketBuild from './createBucketBuild'

describe('createBucketBuild', () => {
  useDatabase()

  beforeEach(async () => {
    await ScreenshotBucket.query()
      .insert([
        {
          id: '1',
          name: 'test-bucket',
          commit: 'a',
          branch: 'test-branch',
        },
        {
          id: '2',
          name: 'base-bucket',
          commit: 'b',
          branch: 'master',
        },
      ])
  })

  it('should return the build', async () => {
    const build = await createBucketBuild(1)
    expect(build.baseScreenshotBucketId).toBe('2')
    expect(build.compareScreenshotBucketId).toBe('1')
  })
})
