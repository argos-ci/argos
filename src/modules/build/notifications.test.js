import playback from 'server/test/playback'
import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import buildNotificationJob from 'server/jobs/buildNotification'
import { processBuildNotification, pushBuildNotification } from './notifications'

jest.mock('server/jobs/buildNotification')

describe('notifications', () => {
  let build

  useDatabase()

  beforeAll(() => {
    buildNotificationJob.push = jest.fn()
  })

  playback({
    name: 'notifications.json',
    mode: 'dryrun',
    // mode: 'record',
  })

  beforeEach(async () => {
    const user = await factory.create('User', {
      // accessToken: process.env.TEST_GITHUB_USER_ACCESS_TOKEN,
      accessToken: 'aaaa',
    })
    const organization = await factory.create('Organization', { login: 'argos-ci' })
    const repository = await factory.create('Repository', {
      name: 'test-repository',
      organizationId: organization.id,
    })
    await factory.create('UserRepositoryRight', { userId: user.id, repositoryId: repository.id })
    const compareScreenshotBucket = await factory.create('ScreenshotBucket', {
      commit: 'e8f58427ebe378ba73dea669c975122fcb8cb9cf',
    })
    build = await factory.create('Build', {
      id: 750,
      repositoryId: repository.id,
      compareScreenshotBucketId: compareScreenshotBucket.id,
    })
  })

  describe('#pushBuildNotification', () => {
    it('should create a build notification and add a job', async () => {
      const buildNotification = await pushBuildNotification({
        buildId: build.id,
        type: 'progress',
      })

      await buildNotification.reload()

      expect(buildNotification.type).toBe('progress')
      expect(buildNotification.buildId).toBe(build.id)
      expect(buildNotificationJob.push).toBeCalledWith(buildNotification.id)
    })
  })

  describe('#processBuildNotification', () => {
    it('should notify GitHub', async () => {
      const buildNotification = await factory.create('BuildNotification', {
        buildId: build.id,
        type: 'progress',
        jobStatus: 'pending',
      })

      const result = await processBuildNotification(buildNotification)
      expect(result.data.id).not.toBeUndefined()
      expect(result.data.description).toBe('Build in progress...')
      expect(result.data.state).toBe('pending')
      expect(result.data.target_url).toBe(`http://www.argos-ci.test/argos-ci/test-repository/builds/${build.id}`)
    })
  })
})
