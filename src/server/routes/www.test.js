import request from 'supertest'
import { useDatabase } from 'server/test/utils'
import Build from 'server/models/Build'
import Repository from 'server/models/Repository'
import Organization from 'server/models/Organization'
import Screenshot from 'server/models/Screenshot'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import ScreenshotDiff from 'server/models/ScreenshotDiff'
import www from './www'

describe('GraphQL', () => {
  useDatabase()

  describe('screenshotDiffs', () => {
    it('should sort the diffs by score', async function () {
      const organization = await Organization.query().insert({
        name: 'bar',
        githubId: 1,
      })
      const repository = await Repository.query().insert({
        name: 'foo',
        githubId: 11,
        enabled: true,
        organizationId: organization.id,
      })
      const screenshotBucket = await ScreenshotBucket.query().insert({
        name: 'default',
        commit: '029b662f3ae57bae7a215301067262c1e95bbc95',
        branch: 'master',
        repositoryId: repository.id,
      })
      const build = await Build.query().insert({
        compareScreenshotBucketId: screenshotBucket.id,
        repositoryId: repository.id,
        createdAt: '2017-02-04T17:14:28.167Z',
      })
      const screenshot1 = await Screenshot.query().insert({
        name: 'email_deleted',
        s3Id: 'id',
        screenshotBucketId: screenshotBucket.id,
      })
      const screenshot2 = await Screenshot.query().insert({
        name: 'email_deleted',
        s3Id: 'id',
        screenshotBucketId: screenshotBucket.id,
      })
      await ScreenshotDiff.query().insert({
        buildId: build.id,
        baseScreenshotId: screenshot1.id,
        compareScreenshotId: screenshot2.id,
        score: 0,
        jobStatus: 'complete',
        validationStatus: 'unknown',
      })
      await ScreenshotDiff.query().insert({
        buildId: build.id,
        baseScreenshotId: screenshot1.id,
        compareScreenshotId: screenshot2.id,
        score: 0.3,
        jobStatus: 'complete',
        validationStatus: 'unknown',
      })

      await request(www)
        .post('/graphql')
        .send({
          query: `{
            screenshotDiffs(buildId: ${build.id}) {
              baseScreenshot {
                name
              }
              compareScreenshot {
                name
              }
              score
            }
          }`,
        })
        .expect((res) => {
          const screenshotDiffs = res.body.data.screenshotDiffs
          expect(screenshotDiffs).toEqual([
            {
              baseScreenshot: {
                name: 'email_deleted',
              },
              compareScreenshot: {
                name: 'email_deleted',
              },
              score: 0.3,
            },
            {
              baseScreenshot: {
                name: 'email_deleted',
              },
              compareScreenshot: {
                name: 'email_deleted',
              },
              score: 0,
            },
          ])
        })
        .expect(200)
    })
  })

  describe('builds', () => {
    let organization
    let repository

    beforeEach(async function () {
      organization = await Organization.query().insert({
        name: 'bar',
        githubId: 1,
      })
      repository = await Repository.query().insert({
        name: 'foo',
        githubId: 11,
        enabled: true,
        organizationId: organization.id,
      })
      const screenshotBucket1 = await ScreenshotBucket.query().insert({
        name: 'default',
        commit: '029b662f3ae57bae7a215301067262c1e95bbc95',
        branch: 'master',
        repositoryId: repository.id,
      })
      const screenshotBucket2 = await ScreenshotBucket.query().insert({
        name: 'default',
        commit: '029b662f3ae57bae7a215301067262c1e95bbc98',
        branch: 'master',
        repositoryId: repository.id,
      })
      await Build.query().insert({
        baseScreenshotBucketId: null,
        compareScreenshotBucketId: screenshotBucket1.id,
        repositoryId: repository.id,
        createdAt: '2017-02-04T17:14:28.167Z',
      })
      await Build.query().insert({
        baseScreenshotBucketId: screenshotBucket1.id,
        compareScreenshotBucketId: screenshotBucket2.id,
        repositoryId: repository.id,
        createdAt: '2017-02-05T17:14:28.167Z',
      })
    })

    it('should be sorted', () => {
      return request(www)
        .post('/graphql')
        .send({
          query: `{
            builds(
              profileName: "${organization.name}",
              repositoryName: "${repository.name}",
              first: 2,
              after: 0
            ) {
              pageInfo {
                totalCount
                endCursor
                hasNextPage
              }
              edges {
                createdAt
              }
            }
          }`,
        })
        .expect((res) => {
          const builds = res.body.data.builds
          expect(builds).toEqual({
            pageInfo: {
              endCursor: 2,
              hasNextPage: false,
              totalCount: 2,
            },
            edges: [
              {
                createdAt: '2017-02-05T17:14:28.167Z',
              },
              {
                createdAt: '2017-02-04T17:14:28.167Z',
              },
            ],
          })
        })
        .expect(200)
    })
  })

  describe('repositories', () => {
    let organization

    beforeEach(async function () {
      organization = await Organization.query().insert({
        name: 'bar1',
        githubId: 1,
      })
      const organization2 = await Organization.query().insert({
        name: 'bar2',
        githubId: 2,
      })
      await Repository.query().insert({
        name: 'foo1',
        githubId: 11,
        enabled: true,
        organizationId: organization.id,
      })
      await Repository.query().insert({
        name: 'foo2',
        githubId: 12,
        enabled: true,
        organizationId: organization2.id,
      })
    })

    it('should filter the repositories', () => {
      return request(www)
        .post('/graphql')
        .send({
          query: `{
            repositories(
              profileName: "${organization.name}",
            ) {
              name
            }
          }`,
        })
        .expect(200)
        .expect((res) => {
          const repositories = res.body.data.repositories
          expect(repositories).toEqual([
            {
              name: 'foo1',
            },
          ])
        })
    })
  })
})
