import { useDatabase } from 'server/test/utils'
import User from 'server/models/User'
import Synchronization from 'server/models/Synchronization'
import synchronize from './synchronize'
import GitHubSynchronizer from './GitHubSynchronizer'

jest.mock('./GitHubSynchronizer')

describe('#synchronize', () => {
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
  })

  it('should call synchronizer', async () => {
    await synchronize(synchronization.id)
    expect(GitHubSynchronizer).toBeCalledWith(expect.objectContaining({ id: synchronization.id }))
    await synchronization.reload()
    expect(synchronization.jobStatus).toBe('complete')
  })
})
