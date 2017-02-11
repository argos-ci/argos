import request from 'supertest'
import { useDatabase } from 'server/testUtils'
import Build from 'server/models/Build'
import Repository from 'server/models/Repository'
import Organization from 'server/models/Organization'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import www from './www'

describe('GraphQL', () => {
  useDatabase()

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
            builds(
              profileName: "${organization.name}",
              repositoryName: "${repository.name}"
            ) {
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
