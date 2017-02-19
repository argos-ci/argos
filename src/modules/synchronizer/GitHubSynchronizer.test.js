import { setTestsTimeout, useDatabase } from 'server/test/utils'
import User from 'server/models/User'
import Synchronization from 'server/models/Synchronization'
import Organization from 'server/models/Organization'
import UserOrganizationRight from 'server/models/UserOrganizationRight'
import Repository from 'server/models/Repository'
import UserRepositoryRight from 'server/models/UserRepositoryRight'
import GitHubSynchronizer from './GitHubSynchronizer'

describe('GitHubSynchronizer', () => {
  setTestsTimeout(10000)
  useDatabase()

  let user
  let synchronization

  beforeEach(async () => {
    user = await User.query().insert({
      accessToken: process.env.NEOZIRO_ACCESS_TOKEN,
      githubId: 266302,
      name: 'Greg Bergé',
      email: 'berge.greg@gmail.com',
    })

    synchronization = await Synchronization.query().insert({
      userId: user.id,
      jobStatus: 'pending',
      type: 'github',
    })

    await synchronization.$relatedQuery('user')
  })

  it('should synchronize all GitHub data', async () => {
    const synchronizer = new GitHubSynchronizer(synchronization)
    await synchronizer.synchronize()

    const [argosOrganization] = await Organization.query().where({ name: 'argos-ci' })
    expect(argosOrganization.githubId).toBe(24552866)

    const [argosOrganizationRight] = await UserOrganizationRight.query()
      .where({ organizationId: argosOrganization.id })
    expect(argosOrganizationRight.userId).toBe(user.id)

    const [argosRepository] = await Repository.query()
      .where({ name: 'argos' })
    expect(argosRepository.githubId).toBe(76593355)
    expect(argosRepository.organizationId).toBe(argosOrganization.id)

    const [argosRepositoryRight] = await UserRepositoryRight.query()
      .where({ repositoryId: argosRepository.id })
    expect(argosRepositoryRight.userId).toBe(user.id)
  })
})
