import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import synchronize from './synchronize'
import GitHubSynchronizer from './GitHubSynchronizer'

jest.mock('./GitHubSynchronizer')

describe('#synchronize', () => {
  useDatabase()

  let user
  let synchronization

  beforeEach(async () => {
    user = await factory.create('User', {
      accessToken: process.env.NEOZIRO_ACCESS_TOKEN,
      githubId: 266302,
      name: 'Greg Bergé',
      email: 'berge.greg@gmail.com',
    })

    synchronization = await factory.create('Synchronization', {
      userId: user.id,
      jobStatus: 'pending',
      type: 'github',
    })
  })

  it('should call synchronizer', async () => {
    await synchronize(synchronization)
    expect(GitHubSynchronizer).toBeCalledWith(expect.objectContaining({ id: synchronization.id }))
  })
})
