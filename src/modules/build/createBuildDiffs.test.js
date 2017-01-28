import { useDatabase } from 'server/testUtils'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import Screenshot from 'server/models/Screenshot'
import createBucketBuild from './createBucketBuild'
import createBuildDiffs from './createBuildDiffs'

describe('createBuildDiffs', () => {
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

    await Screenshot.query()
      .insert([
        {
          id: '1',
          name: 'a',
          s3Id: 'a',
          screenshotBucketId: '1',
        },
        {
          id: '2',
          name: 'b',
          s3Id: 'b',
          screenshotBucketId: '1',
        },
        {
          id: '3',
          name: 'a',
          s3Id: 'a',
          screenshotBucketId: 2,
        },
      ])
  })

  it('should return the build', async () => {
    const build = await createBucketBuild(1)
    const diffs = await createBuildDiffs(build)
    expect(diffs[0].buildId).toBe(build.id)
    expect(diffs[0].baseScreenshotId).toBe('3')
    expect(diffs[0].compareScreenshotId).toBe('1')
    expect(diffs[0].jobStatus).toBe('pending')
    expect(diffs[0].validationStatus).toBe('unknown')
  })
})
