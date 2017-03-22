import path from 'path'
import request from 'supertest'
import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import buildJob from 'server/jobs/build'
import app from './app'

describe('api routes', () => {
  useDatabase()

  beforeAll(() => {
    buildJob.push = jest.fn()
  })

  describe('POST /builds', () => {
    describe('with no valid token', () => {
      it('should respond bad request', async () => {
        await request(app)
          .post('/builds')
          .set('Host', 'api.argos-ci.dev')
          .attach('screenshots[]', path.join(__dirname, '__fixtures__/screenshot_test.jpg'))
          .field('commit', 'test-commit')
          .field('branch', 'test-branch')
          .expect((res) => {
            expect(res.body.error.message).toBe('Invalid token')
          })
          .expect(401)
      })
    })

    describe('with no corresponding repository', () => {
      it('should respond bad request', async () => {
        await request(app)
          .post('/builds')
          .set('Host', 'api.argos-ci.dev')
          .attach('screenshots[]', path.join(__dirname, '__fixtures__/screenshot_test.jpg'))
          .field('commit', 'test-commit')
          .field('branch', 'test-branch')
          .field('token', 'xx')
          .expect((res) => {
            expect(res.body.error.message).toBe('Repository not found (token: "xx")')
          })
          .expect(400)
      })
    })

    describe('with repository not enabled', () => {
      it('should respond bad request', async () => {
        await factory.create('Repository', {
          enabled: false,
          token: 'xx',
        })

        await request(app)
          .post('/builds')
          .set('Host', 'api.argos-ci.dev')
          .attach('screenshots[]', path.join(__dirname, '__fixtures__/screenshot_test.jpg'))
          .field('commit', 'test-commit')
          .field('branch', 'test-branch')
          .field('token', 'xx')
          .expect((res) => {
            expect(res.body.error.message).toBe('Repository not enabled')
          })
          .expect(400)
      })
    })

    describe('with valid repository', () => {
      it('should upload screenshots, update database and return result', async () => {
        await factory.create('Repository', {
          enabled: true,
          token: 'xx',
        })

        await request(app)
          .post('/builds')
          .set('Host', 'api.argos-ci.dev')
          .attach('screenshots[]', path.join(__dirname, '__fixtures__/screenshot_test.jpg'))
          .field('commit', 'test-commit')
          .field('branch', 'test-branch')
          .field('token', 'xx')
          .expect((res) => {
            expect(res.body.id).not.toBeUndefined()
          })
          .expect(200)
      })
    })
  })

  describe('GET /buckets', () => {
    let repository

    beforeEach(async () => {
      repository = await factory.create('Repository')

      await factory.create('ScreenshotBucket', {
        name: 'test-bucket',
        commit: 'test-commit',
        branch: 'test-branch',
        repositoryId: repository.id,
      })
    })

    it('should returns buckets', () => {
      return request(app)
        .get('/buckets')
        .set('Host', 'api.argos-ci.dev')
        .expect((res) => {
          expect(res.body[0].name).toBe('test-bucket')
          expect(res.body[0].commit).toBe('test-commit')
          expect(res.body[0].branch).toBe('test-branch')
          expect(res.body[0].repositoryId).toBe(repository.id)
        })
        .expect(200)
    })

    describe('with query.branch', () => {
      it('should filter by branch', async () => {
        await request(app)
          .get('/buckets?branch=whatever')
          .set('Host', 'api.argos-ci.dev')
          .expect((res) => {
            expect(res.body).toHaveLength(0)
          })
          .expect(200)

        await request(app)
          .get('/buckets?branch=test-branch')
          .set('Host', 'api.argos-ci.dev')
          .expect((res) => {
            expect(res.body).toHaveLength(1)
          })
          .expect(200)
      })
    })
  })
})
