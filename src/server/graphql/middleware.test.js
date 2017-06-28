import request from 'supertest'
import { useDatabase, noGraphqlErrors } from 'server/test/utils'
import factory from 'server/test/factory'
import { VALIDATION_STATUS } from 'server/models/constants'
import * as notifications from 'modules/build/notifications'
import graphqlMiddleware from './middleware'

jest.mock('modules/build/notifications')

describe('GraphQL', () => {
  useDatabase()

  beforeAll(() => {
    notifications.pushBuildNotification = jest.fn()
  })

  describe('build', () => {
    let build
    let user
    let screenshot2

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
      screenshot2 = await factory.create('Screenshot', {
        name: 'email_deleted',
      })
      const screenshot3 = await factory.create('Screenshot', {
        name: 'email_added',
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
      await factory.create('ScreenshotDiff', {
        buildId: build.id,
        baseScreenshotId: screenshot3.id,
        compareScreenshotId: screenshot3.id,
        score: 0,
      })
    })

    it('should sort the diffs by score', async () => {
      await request(graphqlMiddleware())
        .post('/')
        .send({
          query: `{
            build(id: ${build.id}) {
              screenshotDiffs {
                baseScreenshot {
                  name
                }
                compareScreenshot {
                  name
                }
                score
              }
            }
          }`,
        })
        .expect(noGraphqlErrors)
        .expect(res => {
          const { screenshotDiffs } = res.body.data.build
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
                name: 'email_added',
              },
              compareScreenshot: {
                name: 'email_added',
              },
              score: 0,
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

    it('should also display transitioning diffs', async () => {
      await factory.create('ScreenshotDiff', {
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: screenshot2.id,
        score: null,
      })

      await request(graphqlMiddleware())
        .post('/')
        .send({
          query: `{
            build(id: ${build.id}) {
              screenshotDiffs {
                baseScreenshot {
                  name
                }
                compareScreenshot {
                  name
                }
                score
              }
            }
          }`,
        })
        .expect(noGraphqlErrors)
        .expect(res => {
          const { screenshotDiffs } = res.body.data.build
          expect(screenshotDiffs).toEqual([
            {
              baseScreenshot: null,
              compareScreenshot: {
                name: 'email_deleted',
              },
              score: null,
            },
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
                name: 'email_added',
              },
              compareScreenshot: {
                name: 'email_added',
              },
              score: 0,
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
        await request(
          graphqlMiddleware({
            context: { user },
          })
        )
          .post('/')
          .send({
            query: `
              mutation {
                setValidationStatus(
                  buildId: "${build.id}",
                  validationStatus: ${VALIDATION_STATUS.rejected}
                )
              }
            `,
          })
          .expect(noGraphqlErrors)
          .expect(res => {
            expect(res.body.data).toEqual({
              setValidationStatus: VALIDATION_STATUS.rejected,
            })
          })
          .expect(200)

        expect(notifications.pushBuildNotification).toBeCalledWith({
          buildId: build.id,
          type: 'diff-rejected',
        })

        await request(graphqlMiddleware())
          .post('/')
          .send({
            query: `{
              build(id: ${build.id}) {
                screenshotDiffs {
                  validationStatus
                }
              }
            }`,
          })
          .expect(noGraphqlErrors)
          .expect(res => {
            const { screenshotDiffs } = res.body.data.build
            expect(screenshotDiffs).toEqual([
              {
                validationStatus: VALIDATION_STATUS.rejected,
              },
              {
                validationStatus: VALIDATION_STATUS.rejected,
              },
              {
                validationStatus: VALIDATION_STATUS.rejected,
              },
            ])
          })
          .expect(200)
      })

      it('should not mutate when the user is unauthorized', async () => {
        const user2 = await factory.create('User')

        await request(
          graphqlMiddleware({
            context: { user: user2 },
          })
        )
          .post('/')
          .send({
            query: `
              mutation {
                setValidationStatus(
                  buildId: "${build.id}",
                  validationStatus: ${VALIDATION_STATUS.rejected}
                )
              }
            `,
          })
          .expect(res => {
            expect(res.body.errors[0].message).toBe('Invalid user authorization')
          })
          .expect(200)
      })
    })
  })

  describe('repository', () => {
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
    })

    it('should mutate the repository', async () => {
      expect(repository.token).toBe(undefined)
      await request(
        graphqlMiddleware({
          context: { user },
        })
      )
        .post('/')
        .send({
          query: `
            mutation {
              toggleRepository(
                enabled: true,
                repositoryId: "${repository.id}"
              ) {
                enabled
                token
              }
            }
          `,
        })
        .expect(noGraphqlErrors)
        .expect(res => {
          expect(res.body.data).toMatchObject({
            toggleRepository: {
              enabled: true,
            },
          })
          expect(res.body.data.toggleRepository.token.length).toBe(40)
        })
        .expect(200)
    })

    it('should list builds sorted by number', async () => {
      await factory.create('Build', {
        repositoryId: repository.id,
        createdAt: '2017-02-04T17:14:28.167Z',
      })
      await factory.create('Build', {
        repositoryId: repository.id,
        createdAt: '2017-02-05T17:14:28.167Z',
      })
      await request(
        graphqlMiddleware({
          context: { user },
        })
      )
        .post('/')
        .send({
          query: `{
            repository(
              ownerLogin: "${organization.login}",
              repositoryName: "${repository.name}",
            ) {
              builds(
                first: 2,
                after: 0,
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
            }
          }`,
        })
        .expect(noGraphqlErrors)
        .expect(res => {
          const { builds } = res.body.data.repository
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

  describe('owner', () => {
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
      const repository3 = await factory.create('Repository', {
        name: 'foo3',
        userId: user.id,
      })
      await factory.create('UserRepositoryRight', {
        userId: user.id,
        repositoryId: repository1.id,
      })
      await factory.create('UserRepositoryRight', {
        userId: user.id,
        repositoryId: repository2.id,
      })
      await factory.create('UserRepositoryRight', {
        userId: user.id,
        repositoryId: repository3.id,
      })
    })

    it('should filter the repositories (organization)', () =>
      request(
        graphqlMiddleware({
          context: { user },
        })
      )
        .post('/graphql')
        .send({
          query: `{
            owner(
              login: "${organization.login}",
            ) {
              repositories {
                name
              }
            }
          }`,
        })
        .expect(noGraphqlErrors)
        .expect(res => {
          const { repositories } = res.body.data.owner
          expect(repositories).toEqual([
            {
              name: 'foo1',
            },
          ])
        })
        .expect(200))

    it('should filter the repositories (user)', () =>
      request(
        graphqlMiddleware({
          context: { user },
        })
      )
        .post('/graphql')
        .send({
          query: `{
            owner(
              login: "${user.login}",
            ) {
              repositories {
                name
              }
            }
          }`,
        })
        .expect(noGraphqlErrors)
        .expect(res => {
          const { repositories } = res.body.data.owner
          expect(repositories).toEqual([
            {
              name: 'foo3',
            },
          ])
        })
        .expect(200))
  })
})
