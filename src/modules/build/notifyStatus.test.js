import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import notifyStatus from './notifyStatus'

describe('notifyStatus', () => {
  let build

  useDatabase()

  beforeEach(async () => {
    const user = await factory.create('User', {
      accessToken: process.env.TEST_GITHUB_USER_ACCESS_TOKEN,
    })
    const organization = await factory.create('Organization', { name: 'argos-ci' })
    const repository = await factory.create('Repository', {
      name: 'test-repository',
      organizationId: organization.id,
    })
    await factory.create('UserRepositoryRight', { userId: user.id, repositoryId: repository.id })
    const compareScreenshotBucket = await factory.create('ScreenshotBucket', {
      commit: 'e8f58427ebe378ba73dea669c975122fcb8cb9cf',
    })
    build = await factory.create('Build', {
      repositoryId: repository.id,
      compareScreenshotBucketId: compareScreenshotBucket.id,
    })
  })

  it('should notify GitHub', async () => {
    const result = await notifyStatus(build.id, {
      state: 'pending',
      description: 'Pending status from argos',
    })
    expect(result.data.id).not.toBeUndefined()
    expect(result.data.description).toBe('Pending status from argos')
    expect(result.data.state).toBe('pending')
  })
})
