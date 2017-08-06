import { setTestsTimeout, useDatabase } from 'server/test/utils'
import playback from 'server/test/playback'
import factory from 'server/test/factory'
import Organization from 'server/models/Organization'
import UserOrganizationRight from 'server/models/UserOrganizationRight'
import Repository from 'server/models/Repository'
import UserRepositoryRight from 'server/models/UserRepositoryRight'
import GitHubSynchronizer from './GitHubSynchronizer'

describe('GitHubSynchronizer', () => {
  setTestsTimeout(10e3)
  useDatabase()
  playback({
    name: 'GitHubSynchronizer.json',
    mode: 'dryrun',
    // mode: 'record',
  })

  let user
  let synchronization

  beforeEach(async () => {
    user = await factory.create('User', {
      accessToken: 'zzzz',
      // accessToken: process.env.TEST_GITHUB_USER_ACCESS_TOKEN,
    })

    synchronization = await factory.create('Synchronization', {
      userId: user.id,
      jobStatus: 'pending',
      type: 'github',
    })
  })

  it('should synchronize all GitHub data', async () => {
    const synchronizer = new GitHubSynchronizer(synchronization)
    await synchronizer.synchronize()

    const [argosOrganization] = await Organization.query().where({ login: 'argos-ci' })
    expect(argosOrganization.githubId).toBe(24552866)

    const [argosOrganizationRight] = await UserOrganizationRight.query().where({
      organizationId: argosOrganization.id,
    })
    expect(argosOrganizationRight.userId).toBe(user.id)

    const [argosRepository] = await Repository.query().where({ name: 'argos' })
    expect(argosRepository.githubId).toBe(76593355)
    expect(argosRepository.organizationId).toBe(argosOrganization.id)

    const [argosRepositoryRight] = await UserRepositoryRight.query().where({
      repositoryId: argosRepository.id,
    })
    expect(argosRepositoryRight.userId).toBe(user.id)
  })
})
