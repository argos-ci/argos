import request from 'supertest'
import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import www from './www'

describe('GraphQL', () => {
  useDatabase()

  describe('screenshotDiffs', () => {
    it('should sort the diffs by score', async () => {
      const build = await factory.create('Build')
      const screenshot1 = await factory.create('Screenshot', {
        name: 'email_deleted',
      })
      const screenshot2 = await factory.create('Screenshot', {
        name: 'email_deleted',
      })
      await factory.create('ScreenshotDiff', {
        buildId: build.id,
        baseScreenshotId: screenshot1.id,
        compareScreenshotId: screenshot2.id,
        score: 0,
      })
      await factory.create('ScreenshotDiff', {
        buildId: build.id,
        baseScreenshotId: screenshot1.id,
        compareScreenshotId: screenshot2.id,
        score: 0.3,
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

    beforeEach(async () => {
      organization = await factory.create('Organization', {
        name: 'bar',
      })
      repository = await factory.create('Repository', {
        name: 'foo',
        organizationId: organization.id,
      })
      await factory.create('Build', {
        repositoryId: repository.id,
        createdAt: '2017-02-04T17:14:28.167Z',
      })
      await factory.create('Build', {
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

    beforeEach(async () => {
      organization = await factory.create('Organization', {
        name: 'bar1',
      })
      const organization2 = await factory.create('Organization', {
        name: 'bar2',
      })
      await factory.create('Repository', {
        name: 'foo1',
        organizationId: organization.id,
      })
      await factory.create('Repository', {
        name: 'foo2',
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
