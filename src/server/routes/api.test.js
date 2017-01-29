import path from 'path'
import request from 'supertest'
import { useDatabase } from 'server/testUtils'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import app from './app'

describe('api routes', () => {
  useDatabase()

  describe('POST /buckets', () => {
    it('should upload screenshots, update database and return result', () => {
      return request(app)
        .post('/buckets')
        .set('Host', 'api.argos-ci.dev')
        .attach('screenshots[]', path.join(__dirname, '__fixtures__/screenshot_test.jpg'))
        .field('name', 'test-bucket')
        .field('commit', 'test-commit')
        .field('branch', 'test-branch')
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('test-bucket')
          expect(res.body.commit).toBe('test-commit')
          expect(res.body.branch).toBe('test-branch')
          expect(res.body.screenshots.length).toBe(1)
          expect(res.body.screenshots[0].name).toBe('screenshot_test.jpg')
          expect(res.body.screenshots[0].s3Id).toMatch(/^\w{32}$/)
        })
    })
  })

  describe('GET /buckets', () => {
    beforeEach(async function () {
      await ScreenshotBucket.query().insert({
        name: 'test-bucket',
        commit: 'test-commit',
        branch: 'test-branch',
      })
    })

    it('should returns buckets', () => {
      return request(app)
        .get('/buckets')
        .set('Host', 'api.argos-ci.dev')
        .expect(200)
        .expect((res) => {
          expect(res.body[0].name).toBe('test-bucket')
          expect(res.body[0].commit).toBe('test-commit')
          expect(res.body[0].branch).toBe('test-branch')
        })
    })

    describe('with query.branch', () => {
      it('should filter by branch', async function () {
        await request(app)
          .get('/buckets?branch=whatever')
          .set('Host', 'api.argos-ci.dev')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveLength(0)
          })

        await request(app)
          .get('/buckets?branch=test-branch')
          .set('Host', 'api.argos-ci.dev')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveLength(1)
          })
      })
    })
  })
})
