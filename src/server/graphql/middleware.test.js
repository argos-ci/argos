import request from 'supertest'
import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import graphqlMiddleware from './middleware'

jest.mock('modules/build/notifications')
const { pushBuildNotification } = require('modules/build/notifications')

describe('GraphQL', () => {
  useDatabase()

  describe('screenshotDiffs', () => {
    let build
    let user

    beforeEach(async () => {
      user = await factory.create('User')
      const repository = await factory.create('Repository')
      await factory.create('UserRepositoryRight', {
        userId: user.id,
        repositoryId: repository.id,
      })
      build = await factory.create('Build', {
        repositoryId: repository.id,
      })
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
    })

    it('should sort the diffs by score', async () => {
      await request(graphqlMiddleware())
        .post('/')
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

    describe('validationStatus', () => {
      it('should mutate all the validationStatus', async () => {
        await request(graphqlMiddleware({
          context: { user },
        }))
          .post('/')
          .send({
            query: `
              mutation {
                setValidationStatus(buildId: "${build.id}", validationStatus: rejected)
              }
            `,
          })
          .expect((res) => {
            expect(res.body.data).toEqual({
              setValidationStatus: 'rejected',
            })
          })
          .expect(200)

        expect(pushBuildNotification).toBeCalledWith({
          buildId: build.id,
          type: 'diff-rejected',
        })

        await request(graphqlMiddleware())
          .post('/')
          .send({
            query: `{
              screenshotDiffs(buildId: ${build.id}) {
                validationStatus
              }
            }`,
          })
          .expect((res) => {
            const screenshotDiffs = res.body.data.screenshotDiffs
            expect(screenshotDiffs).toEqual([
              {
                validationStatus: 'rejected',
              },
              {
                validationStatus: 'rejected',
              },
            ])
          })
          .expect(200)
      })

      it('should not mutate when the user is unauthorized', async () => {
        const user2 = await factory.create('User')

        await request(graphqlMiddleware({
          context: { user: user2 },
        }))
          .post('/')
          .send({
            query: `
              mutation {
                setValidationStatus(buildId: "${build.id}", validationStatus: rejected)
              }
            `,
          })
          .expect((res) => {
            expect(res.body.errors[0].message).toBe('Invalid user authorization')
          })
          .expect(200)
      })
    })
  })

  describe('builds', () => {
    let user
    let organization
    let repository

    beforeEach(async () => {
      user = await factory.create('User')
      organization = await factory.create('Organization', {
        name: 'bar',
      })
      repository = await factory.create('Repository', {
        name: 'foo',
        organizationId: organization.id,
      })
      await factory.create('UserRepositoryRight', {
        userId: user.id,
        repositoryId: repository.id,
      })
      await factory.create('UserOrganizationRight', {
        userId: user.id,
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
      return request(graphqlMiddleware({
        context: { user },
      }))
        .post('/')
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
                status
                number
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
                number: 2,
                status: 'success',
                createdAt: '2017-02-05T17:14:28.167Z',
              },
              {
                number: 1,
                status: 'success',
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
    let user

    beforeEach(async () => {
      user = await factory.create('User')
      organization = await factory.create('Organization', {
        name: 'bar1',
      })
      const organization2 = await factory.create('Organization', {
        name: 'bar2',
      })
      await factory.create('UserOrganizationRight', {
        userId: user.id,
        organizationId: organization.id,
      })
      const repository1 = await factory.create('Repository', {
        name: 'foo1',
        organizationId: organization.id,
      })
      const repository2 = await factory.create('Repository', {
        name: 'foo2',
        organizationId: organization2.id,
      })
      await factory.create('UserRepositoryRight', {
        userId: user.id,
        repositoryId: repository1.id,
      })
      await factory.create('UserRepositoryRight', {
        userId: user.id,
        repositoryId: repository2.id,
      })
    })

    it('should filter the repositories', () => {
      return request(graphqlMiddleware({
        context: { user },
      }))
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
