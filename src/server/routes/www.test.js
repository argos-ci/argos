import request from 'supertest'
import { useDatabase } from 'server/testUtils'
import Build from 'server/models/Build'
import Repository from 'server/models/Repository'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import www from './www'

describe('GraphQL', () => {
  useDatabase()

  describe('builds', () => {
    let repository

    beforeEach(async function () {
      repository = await Repository.query().insert({
        name: 'foo',
        githubId: 12,
        enabled: true,
      })

      const screenshotBucket = await ScreenshotBucket.query().insert({
        name: 'default',
        commit: '029b662f3ae57bae7a215301067262c1e95bbc95',
        branch: 'master',
        repositoryId: repository.id,
      })

      await Build.query().insert({
        compareScreenshotBucketId: screenshotBucket.id,
        repositoryId: repository.id,
        createdAt: '2017-02-04T17:14:28.167Z',
      })
      await Build.query().insert({
        baseScreenshotBucketId: screenshotBucket.id,
        compareScreenshotBucketId: screenshotBucket.id,
        repositoryId: repository.id,
        createdAt: '2017-02-05T17:14:28.167Z',
      })
    })

    it('should be sorted', () => {
      return request(www)
        .post('/graphql')
        .send({
          query: `{
            builds(repositoryGithubId: ${repository.githubId}) {
              createdAt
            }
          }`,
        })
        .expect(200)
        .expect((res) => {
          const builds = res.body.data.builds
          expect(builds).toEqual([
            {
              createdAt: '2017-02-05T17:14:28.167Z',
            },
            {
              createdAt: '2017-02-04T17:14:28.167Z',
            },
          ])
        })
    })
  })
})
