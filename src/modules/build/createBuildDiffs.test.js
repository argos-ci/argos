import { useDatabase } from 'server/test/utils'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import Build from 'server/models/Build'
import Screenshot from 'server/models/Screenshot'
import Repository from 'server/models/Repository'
import createBuildDiffs from './createBuildDiffs'

jest.mock('modules/build/notifyStatus')
const { notifyProgress } = require('modules/build/notifyStatus')

describe('createBuildDiffs', () => {
  useDatabase()

  let build
  let compareBucket
  let baseBucket
  let compareScreenshot
  let baseScreenshot

  beforeEach(async () => {
    const repository = await Repository.query().insert({
      name: 'foo',
      githubId: 12,
      enabled: true,
      token: 'xx',
    });

    ([compareBucket, baseBucket] = await ScreenshotBucket.query()
      .insert([
        {
          name: 'test-bucket',
          commit: 'a',
          branch: 'test-branch',
          repositoryId: repository.id,
        },
        {
          name: 'base-bucket',
          commit: 'b',
          branch: 'master',
          repositoryId: repository.id,
        },
      ]))

    build = await Build.query()
      .insert({
        baseScreenshotBucketId: baseBucket.id,
        compareScreenshotBucketId: compareBucket.id,
        repositoryId: repository.id,
      });

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
    const diffs = await createBuildDiffs(build.id)
    expect(notifyProgress).toBeCalledWith(build.id)
    expect(diffs[0].buildId).toBe(build.id)
    expect(diffs[0].baseScreenshotId).toBe(baseScreenshot.id)
    expect(diffs[0].compareScreenshotId).toBe(compareScreenshot.id)
    expect(diffs[0].jobStatus).toBe('pending')
    expect(diffs[0].validationStatus).toBe('unknown')
  })
})
