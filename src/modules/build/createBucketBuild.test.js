import { useDatabase } from 'server/testUtils'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import Repository from 'server/models/Repository'
import createBucketBuild from './createBucketBuild'

describe('createBucketBuild', () => {
  useDatabase()

  let repository
  let compareBucket
  let baseBucket

  beforeEach(async () => {
    repository = await Repository.query().insert({
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
  })

  it('should return the build', async () => {
    const build = await createBucketBuild(compareBucket.id)
    expect(build.baseScreenshotBucketId).toBe(baseBucket.id)
    expect(build.compareScreenshotBucketId).toBe(compareBucket.id)
    expect(build.repositoryId).toBe(repository.id)
  })
})
