import path from 'path'
import { useTestTimeout } from '@argos-ci/jest'
import { useDatabase, factory } from '@argos-ci/database/testing'
import {
  usePlayback,
  TEST_GITHUB_USER_ACCESS_TOKEN,
} from '@argos-ci/github/testing'
import {
  Organization,
  UserOrganizationRight,
  UserRepositoryRight,
  Repository,
} from '@argos-ci/database/models'
import { GitHubSynchronizer } from './GitHubSynchronizer'

describe('GitHubSynchronizer', () => {
  useTestTimeout(10e3)
  useDatabase()
  usePlayback({
    fixtures: path.join(__dirname, '__fixtures__'),
    name: 'GitHubSynchronizer.json',
    mode: 'dryrun',
    // mode: 'record',
  })

  let user
  let synchronization

  beforeEach(async () => {
    user = await factory.create('User', {
      accessToken: TEST_GITHUB_USER_ACCESS_TOKEN,
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

    const [argosOrganization] = await Organization.query().where({
      login: 'argos-ci',
    })
    expect(argosOrganization.githubId).toBeDefined()

    const [argosOrganizationRight] = await UserOrganizationRight.query().where({
      organizationId: argosOrganization.id,
    })
    expect(argosOrganizationRight.userId).toBe(user.id)

    const [argosRepository] = await Repository.query().where({ name: 'argos' })
    expect(argosRepository.githubId).toBeDefined()
    expect(argosRepository.organizationId).toBe(argosOrganization.id)

    const [argosRepositoryRight] = await UserRepositoryRight.query().where({
      repositoryId: argosRepository.id,
    })
    expect(argosRepositoryRight.userId).toBe(user.id)
  })
})
