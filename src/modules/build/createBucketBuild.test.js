import { useDatabase } from 'server/testUtils'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import createBucketBuild from './createBucketBuild'

describe('createBucketBuild', () => {
  useDatabase()

  let compareBucket
  let baseBucket

  beforeEach(async () => {
    ([compareBucket, baseBucket] = await ScreenshotBucket.query()
      .insert([
        {
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
      ]))
  })

  it('should return the build', async () => {
    const build = await createBucketBuild(compareBucket.id)
    expect(build.baseScreenshotBucketId).toBe(baseBucket.id)
    expect(build.compareScreenshotBucketId).toBe(compareBucket.id)
  })
})
