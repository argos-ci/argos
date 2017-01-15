/* global jasmine */
import path from 'path';
import request from 'supertest';
import { useDatabase } from 'server/testUtils';
import app from './app';

describe('api routes', () => {
  useDatabase();

  describe('POST /buckets', () => {
    it('should upload screenshots', () => {
      return request(app)
        .post('/buckets')
        .set('Host', 'api.argos-ci.dev')
        .attach('screenshots[]', path.join(__dirname, '__fixtures__/screenshot_test.jpg'))
        .field('name', 'test-bucket')
        .field('commit', 'test-commit')
        .field('branch', 'test-branch')
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('test-bucket');
          expect(res.body.commit).toBe('test-commit');
          expect(res.body.branch).toBe('test-branch');
          expect(res.body.screenshots.length).toBe(1);
          expect(res.body.screenshots[0].name).toBe('screenshot_test.jpg');
          expect(res.body.screenshots[0].s3Id).toMatch(/^\w{32}$/);
        });
    });
  });
});
