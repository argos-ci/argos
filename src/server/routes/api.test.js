import path from 'path'
import request from 'supertest'
import playback from 'server/test/playback'
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
    const token = 'xx'

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
          .field('token', token)
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
          token,
        })

        await request(app)
          .post('/builds')
          .set('Host', 'api.argos-ci.dev')
          .attach('screenshots[]', path.join(__dirname, '__fixtures__/screenshot_test.jpg'))
          .field('commit', 'test-commit')
          .field('branch', 'test-branch')
          .field('token', token)
          .expect((res) => {
            expect(res.body.error.message).toBe('Repository not enabled')
          })
          .expect(400)
      })
    })

    describe('with no user', () => {
      it('should respond bad request', async () => {
        await factory.create('Repository', {
          token,
        })

        await request(app)
          .post('/builds')
          .set('Host', 'api.argos-ci.dev')
          .attach('screenshots[]', path.join(__dirname, '__fixtures__/screenshot_test.jpg'))
          .field('commit', 'test-commit')
          .field('branch', 'test-branch')
          .field('token', token)
          .expect((res) => {
            expect(res.body.error.message).toBe('User not found')
          })
          .expect(400)
      })
    })

    describe('with valid repository', () => {
      playback({
        name: 'api.builds.json',
        mode: 'dryrun',
        // mode: 'record',
      })

      it('should upload screenshots, update database and return result', async () => {
        const accessToken = 'yyy'
        const organization = await factory.create('Organization', {
          login: 'callemall',
        })
        const user = await factory.create('User', {
          accessToken,
        })
        const repository = await factory.create('Repository', {
          name: 'material-ui',
          organizationId: organization.id,
          token,
        })
        await factory.create('UserRepositoryRight', {
          userId: user.id,
          repositoryId: repository.id,
        })

        await request(app)
          .post('/builds')
          .set('Host', 'api.argos-ci.dev')
          .attach('screenshots[]', path.join(__dirname, '__fixtures__/screenshot_test.jpg'))
          .field('commit', '7abbb0e131ec5b3f6ab8e54a25b047705a013864')
          .field('branch', 'related-scrollable-tabs')
          .field('token', token)
          .expect((res) => {
            expect(res.body.id).not.toBe(undefined)
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
