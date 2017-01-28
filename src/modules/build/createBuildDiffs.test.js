import { useDatabase } from 'server/testUtils'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import Screenshot from 'server/models/Screenshot'
import createBucketBuild from './createBucketBuild'
import createBuildDiffs from './createBuildDiffs'

describe('createBuildDiffs', () => {
  useDatabase()

  let compareBucket
  let baseBucket
  let compareScreenshot
  let baseScreenshot

  beforeEach(async () => {
    ([compareBucket, baseBucket] = await ScreenshotBucket.query()
      .insert([
        {
          name: 'test-bucket',
          commit: 'a',
          branch: 'test-branch',
        },
        {
          name: 'base-bucket',
          commit: 'b',
          branch: 'master',
        },
      ]));

    ([compareScreenshot, , baseScreenshot] = await Screenshot.query()
      .insert([
        {
          name: 'a',
          s3Id: 'a',
          screenshotBucketId: compareBucket.id,
        },
        {
          name: 'b',
          s3Id: 'b',
          screenshotBucketId: compareBucket.id,
        },
        {
          name: 'a',
          s3Id: 'a',
          screenshotBucketId: baseBucket.id,
        },
      ]))
  })

  it('should return the build', async () => {
    const build = await createBucketBuild(compareBucket.id)
    const diffs = await createBuildDiffs(build.id)
    expect(diffs[0].buildId).toBe(build.id)
    expect(diffs[0].baseScreenshotId).toBe(baseScreenshot.id)
    expect(diffs[0].compareScreenshotId).toBe(compareScreenshot.id)
    expect(diffs[0].jobStatus).toBe('pending')
    expect(diffs[0].validationStatus).toBe('unknown')
  })
})
