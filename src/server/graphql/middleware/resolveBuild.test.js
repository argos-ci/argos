import request from 'supertest'
import { useDatabase, noGraphqlError } from 'server/test/utils'
import factory from 'server/test/factory'
import graphqlMiddleware from '../middleware'

describe('GraphQL', () => {
  useDatabase()

  describe('resolveBuild', () => {
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
      const res = await request(graphqlMiddleware())
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
      noGraphqlError(res)
      expect(res.status).toBe(200)

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
        .expect(noGraphqlError)
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
  })
})
